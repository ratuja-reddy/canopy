# canopy/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Member(BaseModel):
    id: Optional[int] = None
    name: str
    parent_ids: List[int] = []
    spouse_id: Optional[int] = None
    occupation: Optional[str] = None
    date_of_birth: Optional[str] = None
    date_of_death: Optional[str] = None
    place_of_birth: Optional[str] = None
    place_of_death: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    photo_position: Optional[str] = None

# In-memory store
family_tree = []
tree_name = "My Family Tree"  # Default tree name

class TreeName(BaseModel):
    name: str

@app.get("/members", response_model=List[Member])
def get_members():
    return family_tree

@app.post("/members", response_model=Member)
def add_member(member: Member):
    new_id = max([m.id for m in family_tree], default=0) + 1
    member.id = new_id
    family_tree.append(member)
    return member

@app.put("/members/{member_id}", response_model=Member)
def update_member(member_id: int, updated_member: Member):
    for idx, member in enumerate(family_tree):
        if member.id == member_id:
            family_tree[idx] = updated_member
            return updated_member
    raise HTTPException(status_code=404, detail="Member not found")

@app.get("/tree-name", response_model=TreeName)
def get_tree_name():
    return TreeName(name=tree_name)

@app.put("/tree-name", response_model=TreeName)
def update_tree_name(tree_name_data: TreeName):
    global tree_name
    tree_name = tree_name_data.name
    return TreeName(name=tree_name)
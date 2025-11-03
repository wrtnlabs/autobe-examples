# Community Operations Requirement Specification

## 1. Community Creation

### Core Business Requirements

#### 1.1 Community Formation Process
- WHEN a member attempts to create a new community, THE system SHALL offer to specify:
  - Community name
  - Short description
  - Category
  - Visibility (public/private)
  - Moderation policy
- WHEN the community creation form is submitted, THE system SHALL validate:
  - Name length: 3-50 characters
  - Description length: 10-200 characters
  - Category selection
  - Uniqueness of name (case-insensitive) except for long-form qualified names
- WHEN duplicate community name is detected, THEN THE system SHALL display an error message: 'Community name already exists. Please try a different name.'
- WHEN a community is created, THE system SHALL automatically set the creator as the community's first moderator.

### Mermaid Diagram: Community Creation Workflow
```mermaid
graph LR
  A[Member Initiates Creation] --> B{"Validate Input Format?"}
  B -->|Yes| C[Verify Name Uniqueness]
  C -->|Available| D[Create Community Record]
  C -->|Taken| E[Return Error]
  D --> F[Set Creator as Moderator]
  F --> G[Return Success Message]
  B -->|No| H[Show Validation Errors]
```
# User Actor Analysis and Persona Overview for Todo List Application

## Persona Profile: Todo User

**Actor Role:** Todo User  
An authenticated individual who can create, view, update, complete, and delete their own todo items. This user manages a personal todo list and has no administrative permissions over other users.

**Fictional Persona Example:**  
Name: Jamie Lee  
Age: 29  
Occupation: Office Assistant  
Tech Proficiency: General user, experienced with smartphones and basic web applications  
Typical Environment: Balances multiple work tasks, personal errands, and reminders; often on the move between locations; manages time-sensitive activities and deadlines.

**User Characteristics:**
- Highly motivated to stay organized and productive
- Values privacy – personal tasks are not to be shared or seen by others
- Prefers quick, intuitive interfaces over complex systems
- May use the application from mobile or desktop, in short intervals throughout the day
- Often juggles activities between work, home, and personal interests

## Daily Challenges

- Forgetting or missing important tasks or deadlines due to workload or distractions
- Lacking a centralized and persistent place to store all todos, resulting in scattered notes or unreliable mental lists
- Wasting time re-writing, duplicating, or reorganizing tasks as priorities shift
- Stalling on task completion because of unclear priorities or being overwhelmed by open items
- Difficulty tracking progress with pen-and-paper or non-purpose-built digital tools (e.g., generic notepad apps)
- Having no history to learn from completed/cleared tasks or to review what was accomplished
- Struggling to maintain motivation for less urgent tasks, often leading to procrastination
- Need for minimal friction when adding or updating tasks in busy moments

## Core Needs

- Simple, fast way to add a new todo item with minimal required input
- Ability to easily review, update, complete, or delete any own task at any time
- Confidence that personal tasks are private, secure, and never visible to other users
- Clear separation between completed and pending todos; an efficient way to mark completion
- Easy recovery from accidental actions (such as deleting tasks unintentionally) and undo support where possible
- Immediate feedback on actions; reassurance that changes took effect (no waiting or uncertainty)
- Consistent availability and reliability; expects not to lose data even when switching devices or interrupted by connectivity issues
- Intuitive identification of overdue, due today, and completed tasks
- No requirement or expectation to manage others’ todos; focused only on their personal list

## Motivation for Use

- **WHEN** the user wants to capture an important reminder or task, **THE system SHALL** allow them to add it instantly, reducing cognitive burden (EARS: Event-driven)
- **WHEN** circumstances or priorities change during the day, **THE system SHALL** allow instant updates or reorganizing of existing todos (EARS: Event-driven)
- **THE system SHALL** give confidence that all added tasks will be preserved safely and accessed any time (EARS: Ubiquitous)
- **IF** a todo is completed, **THE system SHALL** provide clear feedback, separating completed items from pending with no risk of accidental loss (EARS: Unwanted Behavior)
- **THE system SHALL** ensure data privacy so that only the owning user can view, manage, or alter their todos (EARS: Ubiquitous)
- **WHEN** the user accidentally deletes a todo, **THE system SHALL** provide a chance for undo/recovery during the session (EARS: Event-driven)
- **WHEN** a task is urgent or overdue, **THE system SHALL** visually indicate priority or lateness to prompt timely action (EARS: Event-driven)
- **WHERE** the user is offline or regains connection, **THE system SHALL** resume reliable operation and synchronize todos seamlessly (EARS: Optional Feature)

## Alignment with Business Goals

- The target user is a self-organizer who needs practical tool support, not a team collaboration platform.
- System success is measured by high active user retention, minimal support queries about lost or missing todos, and user perception of privacy and reliability.
- The service must offer tangible efficiency gains versus writing tasks on paper or using generic note-taking tools.

---

**Reference:**
- [Service Overview Document](./01-service-overview.md)
- [Functional Requirements Document](./05-functional-requirements.md)
- [Authentication Requirements Document](./03-authentication-requirements.md)
- For more details on how this user will interact step-by-step, see the [User Journey Document](./04-user-journey.md).
# Glossary of Terms for Todo List Application

## Introduction

Effective collaboration between all stakeholders of the Todo List Application—developers, testers, business managers, and end users—relies on a shared understanding of terminology. Ambiguous or conflicting definitions can result in communication breakdowns, missed requirements, and software defects. The purpose of this glossary is to offer definitive explanations for key terms and concepts referenced throughout all project documentation, ensuring that business requirements, design, development, and testing are consistently aligned. The audience for this glossary includes every participant involved with the application, irrespective of technical background. Each term included here is rigorously defined to be clear, unambiguous, and actionable. When a term from this glossary appears in requirement or process documents, it always refers to the explanation provided here.

## Key Terms and Definitions

| Term                  | Definition                                                                                                                      |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Todo List             | A personal or shared collection of actionable tasks that a user manages and tracks for individual or collaborative purposes.    |
| Task / Todo Item      | A single actionable unit within a Todo List, representing a specific activity, responsibility, or reminder.                     |
| User                  | An individual registered within the Todo application who can create, manage, edit, and track their own Todo Items.              |
| Admin                 | A privileged user responsible for system administration, monitoring, and the management of all application users and data.      |
| Task Creation         | The process by which a user or admin adds a new Todo Item to a Todo List.                                                      |
| Task Editing          | The ability to modify the content or properties of an existing Todo Item.                                                      |
| Task Deletion         | The act of permanently removing a Todo Item from the Todo List.                                                                |
| Task Completion       | The process of marking a Todo Item as finished or done, reflecting that no further action on this task is required.            |
| Mark as Complete      | The action to update the status of a Todo Item to indicate that it has been accomplished.                                      |
| Overdue Task          | A Todo Item that has a due date which has passed without being marked as completed by the user.                                |
| Active Task           | A Todo Item that is yet to be completed and is not overdue.                                                                   |
| Task Status           | A categorical state of a Todo Item, typically including: active, completed, and optionally overdue.                            |
| Due Date              | The specific date and/or time by which a Todo Item should be completed.                                                        |
| Priority Level        | A designation (e.g., Low, Medium, High) that indicates the relative importance or urgency of a Todo Item.                        |
| Task Filter           | A user-applied control that limits the visible Todo Items to a certain criteria, such as status, due date, or priority.        |
| Search Function       | The ability to find specific Todo Items matching user-defined text or parameters.                                               |
| List View             | The display interface showing the current set of Todo Items, possibly sorted, grouped, or filtered per user settings.           |
| User Authentication   | The process through which users verify their identity (e.g., by logging in) to access their personal Todo List and account.     |
| User Profile          | The collection of information and settings associated with a registered user (e.g., name, email, preferences).                  |
| Account Management    | The set of user actions associated with changing personal or security information, or controlling access to the application.    |
| Permission            | A user’s right to perform a certain action within the application, defined based on the user’s actor type (User or Admin).      |
| Session               | The period during which a user's authentication is valid, allowing ongoing access to their Todo List and actions.                |
| Task Ownership        | The association that each Todo Item is exclusively managed and visible to its creator, unless explicitly shared or changed.     |
| Data Retention Policy | Business rule outlining how long user and Todo Item data is stored before being deleted or archived.                            |
| Error Handling        | The system’s process for detecting, reporting, and guiding user recovery from errors or exceptional events.                     |
| Recovery Flow         | The user journey from encountering an error or failure to successful task completion or resolution.                             |
| Non-Functional Requirement | A system quality or constraint not directly tied to user feature requests, such as performance, scalability, or security.      |
| Authentication Token  | A secure, unique value (such as JWT) issued upon successful login, enabling a user to maintain an authorized session.           |
| Permission Matrix     | A tabular mapping of allowed or restricted actions for each user actor in the system.                                          |
| Business Rule         | A policy or constraint defining system logic, such as what constitutes task completion, deletion, or priority.                 |
| Workflow              | The ordered set of actions through which users accomplish tasks within the Todo application.                                    |
| Validation Constraint | A check or rule ensuring input data to the system meets expected format or business logic, preventing improper data entry.      |
| Filtering             | The ability for a user to view only specific Todo Items according to selected criteria.                                        |
| CRUD                  | Acronym for Create, Read, Update, Delete—the four fundamental actions to manage Todo Items.                                   |
| Status Update         | Action of changing the state of a Todo Item, such as marking it as completed or reverting it to active.                        |
| Data Lifecycle        | The stages through which data passes: creation, active use, update, archival, and deletion.                                    |

## Usage Guidelines

- Users, business analysts, and developers SHALL always reference this glossary when encountering domain terms in requirements, specifications, or user stories to ensure consistent interpretation.
- WHEN developing, reviewing, or updating requirements documents, THE team SHALL verify that any domain-specific term is defined here, and if not, SHALL propose a definition for stakeholder approval before further progress.
- WHEN a project document refers to a term from this glossary, THE intended meaning SHALL be that given here, and ambiguity SHALL be resolved using these definitions.
- Maintain this glossary as a living document; WHEN new business concepts arise during the system's lifecycle, definitions SHALL be refined, added, or clarified through stakeholder review.

## Scope and Boundaries

- This glossary is strictly limited to business and user-facing terms relevant to the Todo List Application’s features and operation.
- It DOES NOT provide technical specification, implementation details, or programming concepts not directly referenced in end-user or business requirements.
- The glossary SHALL NOT serve as a database schema or API documentation resource.

## Cross-References

- All other requirement documents, user scenarios, and workflow diagrams for the Todo List Application SHALL reference the terms in this glossary.
- WHEN new requirement documents are added, THE author SHALL ensure all non-obvious terms are cross-referenced here or proposed as additions.

## Change Process

- Propose additions, clarifications, or corrections to this glossary via stakeholder meetings, requirement review sessions, or change requests.
- Review and update the glossary in regular project retrospectives and as part of the release planning process to ensure accurate, up-to-date definitions are available for all stakeholders.

# Community Platform: Project Documentation Hub

This central document serves as the table of contents and primary navigational guide for all requirements documentation related to the **communityPlatform** backend service. The platform is a Reddit-like system designed to foster user-driven content and discussion through interest-based communities.

Each document below details a specific aspect of the system, from high-level business goals to specific functional requirements. They collectively form the complete specification for developers.

## Documentation Index

1.  **[Service Overview](./01-service-overview.md)**
    *   *Provides a high-level overview of the platform's vision, business objectives, monetization strategy, and core features.*

2.  **[User Actors and Permissions](./02-user-actors-and-permissions.md)**
    *   *Defines the roles within the system (Guest, Member, Admin) and details their specific access rights and limitations in a comprehensive permission matrix.*

3.  **[User Authentication and Profiles](./03-user-authentication-and-profiles.md)**
    *   *Details the requirements for user registration, login, session management using JWT, password policies, and the structure of user profiles.*

4.  **[Community Management](./04-community-management.md)**
    *   *Specifies the functionalities for creating, managing, and discovering communities, including settings, privacy levels, and moderation roles.*

5.  **[Post Creation and Interaction](./05-post-creation-and-interaction.md)**
    *   *Describes how users create and interact with posts (text, link, image), including content rules, voting mechanics, and editing/deleting logic.*

6.  **[Commenting System](./06-commenting-system.md)**
    *   *Outlines the requirements for the nested commenting system, including threading, replies, voting, and notifications.*

7.  **[Karma and User Reputation](./07-karma-and-user-reputation.md)**
    *   *Explains the business logic behind the user karma system, detailing how it is calculated, displayed, and how it impacts user privileges.*

8.  **[Content Sorting and Discovery](./08-content-sorting-and-discovery.md)**
    *   *Defines the algorithms for sorting posts by "Hot," "New," "Top," and "Controversial" to drive content discovery and user engagement.*

9.  **[Content Moderation and Reporting](./09-content-moderation-and-reporting.md)**
    *   *Details the process for users to report inappropriate content and for admins to review and act upon these reports through a moderation queue.*

10. **[Business Rules and Constraints](./10-business-rules-and-constraints.md)**
    *   *Consolidates all key business rules and system-wide constraints, such as content character limits, rate-limiting policies, and naming conventions.*

11. **[Non-Functional Requirements](./11-non-functional-requirements.md)**
    *   *Specifies the system-wide quality attributes, including performance targets (response times), scalability needs, security mandates, and availability goals.*

> **Developer Note**: This entire documentation suite defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.

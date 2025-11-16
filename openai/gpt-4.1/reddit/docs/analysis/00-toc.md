# Table of Contents: Reddit-like Community Platform Documentation

## Introduction
Welcome to the documentation set for the Reddit-like Community Platform. This master table of contents serves as your primary navigation tool for all business requirements and architectural planning documents. Each section below provides a direct link to a more detailed business or functional requirements document, ensuring every stakeholder and developer can find the information they need, precisely when they need it.

## Service Vision and Business Model
For the mission statement, target user profiles, key objectives, market positioning, and business model—including value differentiation and revenue strategy—refer to the [Service Overview Document](./01-service-overview.md).

## Problem and Opportunity Statement
For insights into market needs, user pain points, competitive landscape, and opportunities for new value creation, refer to the [Problem and Opportunity Statement](./02-problem-opportunity.md).

## Core Value Proposition
For a breakdown of the unique benefits delivered to users, moderators, and administrators—and a comparison with market alternatives—refer to the [Core Value Proposition](./03-value-proposition.md).

## Service Operations Overview
For detailed summaries and diagrams outlining how communities are created and managed, the lifecycle of posts and comments, voting and karma logic, subscription flows, and reporting, see the [Service Operations Overview](./04-service-operation.md).

## User Actors and Permissions
For authentication flows, complete business actor definitions, a full permission matrix, detailed actor workflows, and JWT/session management rules, review the [User Actors and Permissions Documentation](./05-user-actors.md).

## Primary User Journeys
For step-by-step major user scenarios—from registration and onboarding through subscription, posting, voting, commenting, and core flows—see the [Primary User Journeys Document](./06-primary-user-journeys.md).

## Secondary and Exceptional Scenarios
For less common but important business scenarios, such as content reporting and escalation, user profile management, voting boundaries, moderator workflows, and account states, refer to the [Secondary and Exceptional Scenarios Document](./07-secondary-exceptional-scenarios.md).

## Karma and Voting Rules
For business logic and validation requirements around user karma calculation, upvoting/downvoting, post and comment ranking, sorting, and abuse prevention, see the [Karma and Voting Rules Documentation](./08-karma-voting-rules.md).

## Sorting and Discovery
For business rules defining how posts and communities are sorted (hot, new, top, controversial), community discovery and recommendation, and search rules, refer to the [Sorting and Discovery Documentation](./09-sorting-discovery.md).

## Security, Privacy, and Compliance
For business requirements around user data protection, privacy standards, content moderation workflows, abuse prevention, and compliance, see the [Security, Privacy, and Compliance Documentation](./10-security-privacy-compliance.md).

## Performance and Scalability Requirements
For targeted performance benchmarks, business-driven scalability needs, and reliability rules, as well as disaster recovery expectations, refer to the [Performance and Scalability Requirements](./11-performance-scalability.md).

## Business Rules and Validation Logic
For a comprehensive capture of core business rules, input/output validation logic, scenario flows, and actor-specific validations, see the business rules section in each dedicated requirements document.

## Error Handling and Content Moderation
For business expectations about reporting, automated and manual moderation, error messaging, and recovery conditions for user-facing scenarios, refer to the [Secondary and Exceptional Scenarios Document](./07-secondary-exceptional-scenarios.md) and [Security, Privacy, and Compliance Documentation](./10-security-privacy-compliance.md).

## External Integrations and Notifications
For future extensions and integrations such as notification systems (email, push), analytics, or third-party authentications, consult future updates to this documentation set.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

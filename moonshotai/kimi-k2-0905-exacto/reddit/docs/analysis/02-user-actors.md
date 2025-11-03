# User Actors and Authentication Requirements

## User Actor Overview

The Reddit-like community platform operates with four distinct user actor types, each serving specific purposes within the ecosystem. These actors represent different levels of platform engagement, from passive browsing to active community management and system administration.

THE system SHALL maintain clear separation between actor types, ensuring appropriate access controls and permission boundaries. Each actor type represents a unique user persona with specific capabilities, restrictions, and interaction patterns within the community ecosystem.

## Guest Users

### Characteristics
Guest users represent the entry point of the platform's user journey. These non-authenticated visitors can explore public content to understand community dynamics before deciding to register. Guest access serves as a discovery mechanism, allowing potential users to preview community culture, content quality, and discussion styles.

### Capabilities
THE guest SHALL browse all public communities (subreddits) without authentication requirements. Guests can view posts, read comments, search content, and examine community descriptions and rules. THE guest SHALL access user profiles that are publicly visible, providing insight into community participants before registration.

### Limitations
THE guest SHALL NOT interact with community content through voting, posting, or commenting functions. Guests cannot subscribe to communities, create private communities, initiate direct messages, or access restricted content. THE system SHALL prevent guests from viewing sensitive user information or private community discussions.

### Business Value
Guest access reduces friction in the user acquisition funnel by allowing exploration without commitment, while encouraging registration by demonstrating the platform's community vitality and content variety.
import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalDiscussionGuestUser {
  /**
   * Guest user registration data for creating new accounts in the economic
   * and political discussion board.
   *
   * Represents the data required to register anonymous visitors as guest
   * users who can participate in discussions, create articles, and engage
   * with the community. This registration enables limited authenticated
   * access without requiring full user profile creation.
   *
   * The registration validates display_name for community identification and
   * email for account management, with optional bio and avatar_url for
   * profile enhancement. The system automatically sets status to 'active' and
   * establishes the foundation for user engagement within the discussion
   * board platform.
   *
   * Guest users can create articles, participate in discussions, and build
   * their community presence while maintaining proper data integrity through
   * database constraints. This type supports the initial user onboarding
   * process for the discussion board system and directly maps to the
   * econ_political_discussion_users Prisma model for database persistence.
   */
  export type ICreate = {
    /**
     * User's display name used for community identification and article
     * authorship. Must be unique across all guest users and follows
     * community naming conventions. Display name appears alongside articles
     * and comments in the discussion board interface. This field is
     * required for account creation and serves as the primary identifier
     * for user-generated content.
     */
    display_name: string;

    /**
     * User's email address for account management and communication. Must
     * be unique across all guest users and valid email format. Used for
     * account verification, password recovery, and important system
     * notifications. The email serves as the unique key for user
     * identification and authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional personal biography or description for the guest user's
     * profile. Allows users to provide background information about their
     * interests, expertise, or motivation for participating in economic and
     * political discussions. Displayed in user profile and community
     * listings to help other participants understand the user's background
     * and expertise areas.
     */
    bio?: string | undefined;

    /**
     * Optional URL to the user's avatar image for profile visualization.
     * Must be a valid URI pointing to an accessible image file (typically
     * JPEG, PNG, or GIF formats). Used to enhance user recognition and
     * community engagement in the discussion board interface. Avatar images
     * help create a more personal and engaging user experience.
     */
    avatar_url?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Guest user authorization response containing complete account information
   * for authenticated discussion board access.
   *
   * Represents the comprehensive user account data returned after successful
   * guest registration or token refresh, providing the authenticated user
   * context needed to access all discussion board functionality. This
   * response includes the complete user profile information alongside
   * authentication token details for API access.
   *
   * The authorization response contains the user's unique identifier, display
   * name, profile details, and account status, enabling the frontend to
   * render user-specific interfaces, maintain user session state, and display
   * accurate user information throughout the discussion board. JWT token
   * information is provided separately to establish secure API authentication
   * for subsequent requests.
   *
   * This response type is used for both guest registration completion and
   * token refresh operations, establishing the authenticated user context
   * required for all subsequent API interactions including article creation,
   * comment participation, and user profile management in the discussion
   * board system.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest user account. UUID
     * format ensures globally unique identification across the discussion
     * board system. Used for referencing user in articles, comments, and
     * user management operations. This identifier remains constant
     * throughout the user's account lifecycle.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's display name used for community identification and article
     * authorship. Confirms the display name registered during account
     * creation and appears alongside user-generated content throughout the
     * discussion board interface. This name represents the user's public
     * identity in the community.
     */
    display_name: string;

    /**
     * User's email address for account management and communication.
     * Confirms the email registered during account creation and remains
     * consistent for account verification and notification purposes. This
     * email serves as the primary contact method for account-related
     * communications.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional personal biography or description for the guest user's
     * profile. Contains the biographical information provided during
     * registration, displayed in user profile and community listings to
     * help other participants understand the user's background, expertise,
     * and interests in economic and political discussions.
     */
    bio?: string | undefined;

    /**
     * Optional URL to the user's avatar image for profile visualization.
     * Contains the avatar URL provided during registration, used to enhance
     * user recognition and community engagement throughout the discussion
     * board interface. Avatar images help create a more personalized and
     * visually appealing user experience.
     */
    avatar_url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Current status of the guest user account indicating accessibility and
     * permissions. 'active' accounts can participate in all discussion
     * board features, 'inactive' accounts have limited access, and
     * 'suspended' accounts are temporarily prohibited from participation.
     * This status controls the user's ability to interact with the
     * platform.
     */
    status: string;

    /**
     * Timestamp when the guest user account was created in the discussion
     * board system. Automatically set during registration and used for user
     * activity tracking, community statistics, and chronological user
     * management operations. This timestamp helps track user tenure and
     * engagement patterns.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the last update to the guest user account information.
     * Automatically maintained by the system and used for tracking profile
     * changes, activity monitoring, and user engagement analytics. This
     * field helps identify when user information was last modified.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest user account was soft-deleted from the
     * system. Null for active accounts, contains deletion timestamp for
     * deactivated accounts. Used for account restoration, data retention
     * policies, and audit trail compliance. This field supports the
     * platform's soft delete functionality.
     */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}

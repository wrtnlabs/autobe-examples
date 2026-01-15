import { tags } from "typia";

export namespace ICommunityPlatformUser {
  /**
   * Summary representation of a community platform user for display in
   * notifications and other contexts.
   *
   * This type provides essential user information for display in notification
   * events, comment threads, and other cross-entity references without
   * exposing sensitive account details. The summary format is designed for
   * efficient list rendering and optimized for API responses.
   *
   * The summary includes only public-facing and essential information:
   *
   * - Unique identifier for direct linking and referencing
   * - Display name for user recognition
   * - Email address for internal system reference
   * - Role classification to determine user privileges
   *
   * This summary type is used wherever user identification is needed for
   * context but full profile details or sensitive information are not
   * required, such as in notification events where the sender or recipient is
   * referenced. All text fields follow platform formatting standards and are
   * appropriately localized for international users.
   */
  export type ISummary = {
    /**
     * Unique identifier for the community platform user account.
     *
     * Each user account in the community platform system is assigned a
     * globally unique UUID identifier upon registration. This ID is
     * immutable and serves as the primary key for all relationships between
     * user accounts and other entities in the system (notifications,
     * profiles, content, etc.).
     *
     * The UUID format ensures uniqueness across distributed systems and
     * allows for safe use in APIs without revealing sequential information
     * about user registration order.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name for the user account.
     *
     * The user's preferred public display name used throughout the platform
     * for identification in posts, comments, profiles, and notifications.
     *
     * This field is required for all user accounts and must be unique
     * within the platform. Display names should be appropriate for public
     * viewing and adhere to community guidelines. The length restriction
     * ensures display names are concise and readable in UI interfaces.
     */
    name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * User's primary email address for account communication.
     *
     * The official email address associated with the user account, used for
     * authentication, password recovery, system notifications, and account
     * verification.
     *
     * This field must contain a valid email address format according to RFC
     * 5322 specifications. The email address is private to the user and is
     * not publicly displayed, but is used internally by the system for
     * communication purposes.
     */
    email: string & tags.Format<"email">;

    /**
     * User role designation indicating the level of access and permissions
     * within the community platform.
     *
     * Roles define what actions users can perform on the platform:
     *
     * - Guest: Unauthenticated users with limited access to public content
     *   only
     * - Member: Authenticated users who can create content, interact with
     *   others, and participate in communities
     * - Admin: System administrators with elevated privileges to moderate
     *   content and manage system configuration
     *
     * The assigned role determines which API endpoints users can access and
     * what operations they are permitted to perform.
     */
    role: "guest" | "member" | "admin";
  };
}

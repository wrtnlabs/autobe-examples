import { tags } from "typia";

import { IRedditPlatformAuthToken } from "./IRedditPlatformAuthToken";
import { IRedditPlatformCommunityCommunity } from "./IRedditPlatformCommunityCommunity";

export namespace IRedditPlatformCommunityAdmin {
  /**
   * Request schema for refreshing site administrator authentication tokens.
   * Accepts a refresh token to generate new access and refresh tokens while
   * maintaining the administrative session. This DTO is used exclusively in
   * the /auth/siteadmin/refresh POST operation to facilitate secure token
   * rotation without requiring re-authentication. The design follows security
   * best practices by having the refresh token provided as the only input,
   * with all other context (admin identity) retrieved from the authenticated
   * session. This ensures session continuity while preventing token replay
   * attacks through proper validation against the database records.
   */
  export type IRefresh = {
    /**
     * Refresh token used to generate new access tokens for site
     * administrator sessions. This token must be a valid UUID string that
     * matches a record in the reddit_platform_auth_tokens table. The token
     * must be valid, unrevoked, and not expired to successfully refresh the
     * session. Tokens follow standard UUID format as defined in RFC 4122,
     * typically appearing as 8-4-4-4-12 hexadecimal characters.
     *
     * This field is the sole required input for the refresh operation. The
     * token is passed in the request body and is validated against the
     * authentication records to ensure session continuity without requiring
     * re-authentication with credentials. The refresh token is always
     * provided in string format with no additional validation beyond UUID
     * format checking, as the backend system handles all token validity
     * checks against the database records.
     */
    refresh_token: string & tags.Format<"uuid">;
  };

  /**
   * Authorization response for community administration accounts. Contains
   * the authenticated session token and profile information after successful
   * login or registration. The token is valid for subsequent API requests
   * requiring administrative privileges.
   *
   * This response structure ensures security by excluding sensitive
   * information such as passwords while providing necessary session data. The
   * user profile is provided in summary format to balance completeness with
   * performance requirements.
   *
   * Used for all authentication operations including login, registration, and
   * token refresh for community admins.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the community admin account. This is a standard
     * UUID format value generated automatically upon account creation.
     *
     * Represents the primary key used to link the comminity admin to their
     * user profile in the database. All API operations referencing
     * community admins will use this identifier for resource addressing.
     *
     * UUID format ensures global uniqueness across distributed systems,
     * preventing collision issues during high-volume user registration and
     * session management.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IRedditPlatformAuthToken;

    /**
     * Community admin profile information including public details.
     *
     * Provides essential user context like name, email, and profile status
     * for the authenticated session, excluding all sensitive information
     * such as passwords and authentication tokens.
     *
     * This object is derived from the full user profile using the summary
     * variant pattern, optimized for performance while maintaining complete
     * necessary context for administrative functions.
     */
    user: IRedditPlatformCommunityAdmin.ISummary;
  };

  /**
   * Site administrator registration request body. This schema represents the
   * essential information required to register a new site administrator
   * account. The email field must be a valid business email address as per
   * system policies, not personal email domains. The password must meet
   * defined strength requirements including minimum length, character
   * variety, and prevention of common patterns. All fields directly
   * correspond to the database fields in the reddit_platform_siteadmins
   * table, matching the entity structure. Email uniqueness is validated upon
   * registration to prevent duplicate accounts.
   */
  export type IJoin = {
    /**
     * Valid business email address for the site admin. Must not be a
     * personal email domain like Gmail, Yahoo, or Outlook. Must be unique
     * across the platform to prevent duplicate accounts. Follows standard
     * RFC 5322 email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Initial password for the new site admin account. Must meet minimum
     * strength requirements: at least 12 characters, containing at least
     * one uppercase letter, one lowercase letter, one number, and one
     * special character. Does not accept pre-hashed passwords - plaintext
     * is required for system hashing and storage.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Represents the profile information of a currently authenticated community
   * administrator within the platform. This object provides the public-facing
   * details of the administrator along with their current community
   * affiliation and role, enabling consistent display across different parts
   * of the platform.
   *
   * The profile includes essential user identity information such as a public
   * name and profile picture URL, which are visible to other community
   * members. This information is derived from the user's public profile
   * settings.
   *
   * The community-specific information such as the current community details
   * and admin role is crucial for context in community management operations.
   * This allows the system to verify permissions and show appropriate
   * interface elements based on the community the administrator is currently
   * working with.
   *
   * The profile structure is designed to be lightweight for efficient loading
   * across all community administration interfaces while providing sufficient
   * contextual data for administrative actions.
   */
  export type IProfile = {
    /**
     * Unique identifier for the community administrator profile,
     * corresponding to the entry in the community administrators table.
     * This is a globally unique identifier used for all references within
     * the system and follows UUID standard format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The public display name of the community administrator as configured
     * in their user profile settings. This name is visible to other members
     * of the community and is not the authentication username.
     */
    name: string;

    /**
     * URL to the administrator's public profile image, sourced from the
     * platform's media storage service. This image is displayed in
     * community interfaces and should be accessible to all authenticated
     * users within their community.
     */
    profile_picture_url: string & tags.Format<"uri">;

    /**
     * Represents the current community affiliation of the administrator.
     * This reference provides essential community context including the
     * unique identifier, name, and public access configuration without
     * revealing internal community members or detailed content. The
     * community reference is crucial for administrative operations that
     * must respect current community scope constraints, allowing systems to
     * properly filter management features and permissions based on the
     * administrator's active community context. This field should not
     * include membership details of the community, as those are managed
     * separately through user-community subscriptions.
     */
    community: IRedditPlatformCommunityCommunity.ISummary;

    /**
     * Specific administrative role within the community, which includes the
     * permission level assigned to the administrator. This field must
     * contain one of the three predefined values: 'admin' (full community
     * administration permissions), 'moderator' (limited moderation
     * permissions without deletion rights), or 'community_creator'
     * (original community creator with special privileges). Invalid values
     * will result in API validation errors.
     */
    role: string;
  };

  /**
   * Request DTO for site administrator authentication. Contains both
   * authentication credentials and essential session context required for
   * secure login.
   *
   * This schema is designed specifically for the /auth/siteadmin/login
   * endpoint where site administrators log in to platform with full
   * administrative privileges.
   *
   * Key security elements:
   *
   * - Password field expects plaintext for server-side hashing
   * - Session context (href, referrer) is mandatory for security monitoring
   * - IP is optional (can be client-provided or server-extracted)
   *
   * All data validation aligns with the database schema requirements for
   * reddit_platform_siteadmins table.
   *
   * Note: This schema strictly follows the self-login pattern where the
   * requesting entity (site administrator) is the target of the login
   * operation.
   */
  export type ILogin = {
    /**
     * Email address associated with site administrator account. Must be a
     * valid email format and match the registered account. Used as the
     * primary identifier for authentication.
     *
     * This field is required to verify the administrator's identity against
     * the database records in reddit_platform_siteadmins table. The email
     * address must be unique for each administrator account.
     *
     * The system validates the email format during request processing to
     * ensure standard email format compliance as per RFC 5322
     * specifications.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Community admin profile summary with public details. Provides essential
   * information for the admin's authenticated session without exposing
   * sensitive data like passwords or tokens. Optimized for performance in
   * authorization flows and API responses.
   *
   * Contains the key public identity fields necessary for platform
   * operations, including the admin's display name and contact information.
   * The profile does not include any security-sensitive fields or internal
   * system identifiers.
   *
   * Fields are validated to ensure they meet platform standards for naming
   * and format. The profile summary is designed to balance completeness with
   * minimal resource usage for efficient API responses.
   */
  export type ISummary = {
    /**
     * Public username identifier used for authenticating and displaying the
     * community admin's identity across the platform. Must follow platform
     * naming conventions (3-50 characters, alphanumeric with underscores).
     * Used in the login process and visible to other users.
     */
    username: string & tags.MinLength<3> & tags.MaxLength<50>;

    /**
     * Email address associated with the community admin's account. Used for
     * system communications and verified account management. This field is
     * part of the registration process and displayed publicly.
     */
    email: string & tags.MinLength<1> & tags.Format<"email">;

    /**
     * URL to the community admin's profile image. Optional field indicating
     * the location of the user's avatar or profile picture. If provided, it
     * serves for visual identification in interfaces.
     */
    profileImageUrl?: (string & tags.Format<"uri">) | undefined;
  };
}

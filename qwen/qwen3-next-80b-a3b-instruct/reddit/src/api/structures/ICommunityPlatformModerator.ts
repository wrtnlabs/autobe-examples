import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformModerator {
  /**
   * Request body containing registration information for a new moderator
   * account.
   *
   * This schema defines the required fields for creating a new moderator user
   * on the communityPlatform system.
   *
   * Moderators are classified as 'member' kind users in the system and must
   * complete full registration including email verification and password
   * setup.
   *
   * This object corresponds to the community_platform_member and
   * community_platform_user_profiles tables.
   *
   * The required fields (email, username, password) populate the
   * community_platform_member table directly.
   *
   * The optional bio field populates the community_platform_user_profiles
   * table after the member record is created.
   *
   * The password is not stored directly; it is hashed using bcrypt before
   * being stored in the password_hash column.
   *
   * The identification (email, username) must be unique across all members,
   * not just moderators.
   *
   * The system will generate an email verification token and send it upon
   * successful registration.
   */
  export type ICreate = {
    /**
     * The unique email address of the moderator being registered.
     *
     * This must be a valid email format and must be unique across the
     * entire platform.
     *
     * This field is mandatory and corresponds to the email column in the
     * community_platform_member table.
     *
     * Email is used for authentication, notification delivery, and
     * verification. It is subject to uniqueness constraints and must not be
     * used by any other member.
     *
     * The email is not displayed publicly and does not appear in the user
     * interface.
     *
     * This field is case-insensitive in processing and storage, but the
     * case entered by the user is preserved.
     */
    email: string & tags.Format<"email">;

    /**
     * The display username for the moderator account.
     *
     * This must be unique across the platform and contain only alphanumeric
     * characters and underscores.
     *
     * This field corresponds to the username column in the
     * community_platform_member table and is used publicly for display in
     * posts and comments.
     *
     * The username is indexed for fast lookup and must not clash with
     * existing usernames.
     *
     * This field is required and cannot contain spaces, hyphens, or special
     * characters except underscore.
     *
     * The username is case-sensitive when matched for uniqueness but
     * displayed as entered by the user.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">;

    /**
     * The plain-text password for the new moderator account.
     *
     * The password must be at least 8 characters long and contain at least
     * one uppercase letter, one lowercase letter, and one digit.
     *
     * This password will be securely hashed using bcrypt with a cost factor
     * of 12 before storage in the password_hash field of the
     * community_platform_member table.
     *
     * The password is never stored, logged, or transmitted in plaintext. It
     * must be submitted in plaintext only during registration and
     * immediately discarded after hashing.
     *
     * The system will reject passwords containing known breaches or
     * commonly used patterns via an external password security service if
     * available.
     *
     * This field is mandatory and corresponds to the password_hash storage
     * requirement in the schema.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">;

    /**
     * An optional short biography or self-description for the moderator's
     * profile.
     *
     * This text will be displayed on the moderator's public profile page if
     * provided.
     *
     * It is stored in the bio field of the community_platform_user_profiles
     * table and should provide context about the moderator's interests or
     * expertise.
     *
     * Maximum length is 400 characters to ensure efficient display and
     * avoid excessive data storage.
     *
     * This field is optional; if omitted, the profile will display the
     * username as the display name.
     */
    bio?: (string & tags.MaxLength<400>) | undefined;
  };

  /**
   * Authorization response containing JWT token and moderator identification.
   *
   * This response is returned after successful authentication operations such
   * as login, join, or token refresh for moderator accounts. It follows the
   * standard IAuthorized pattern where the moderator's identity is combined
   * with a JWT token that enables secure API communication.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator.
     *
     * This identifier corresponds to the member_id in the
     * community_platform_member table and is used as the primary key for
     * authentication sessions.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login request payload for moderator authentication.
   *
   * This structure provides the credentials required to authenticate a
   * moderator user. It contains exactly two fields: the email (required) and
   * password (required), which are validated against the
   * community_platform_member table.
   *
   * This DTO is used exclusively for the login operation and should not be
   * confused with registration (IJoin) or refresh (IRefresh) structures,
   * which have different field requirements.
   */
  export type ILogin = {
    /**
     * The moderator's registered email address, used for authentication.
     *
     * This field corresponds to the email column in the
     * community_platform_member table. It must be a valid email address
     * that has been previously registered and verified in the system.
     *
     * The email serves as the unique identifier for the moderator's account
     * during the login process. It must match exactly with a record in the
     * community_platform_member table.
     */
    email: string & tags.Format<"email">;

    /**
     * The plain-text password provided during login.
     *
     * This password is used by the authentication system to verify identity
     * against the stored password_hash in the community_platform_member
     * table. It must meet the complexity requirements: at least 8
     * characters with a mix of uppercase, lowercase, and digit characters.
     *
     * Sensitive information: The password is never stored in the system in
     * plain text and is only used temporarily during authentication
     * verification.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Request body for the ICommunityPlatformModerator.IRefresh type,
   * containing no payload as refresh is handled via HTTP-only cookies.
   *
   * This schema represents the token refresh request for moderator users. The
   * refresh operation authenticates using a refresh token stored in an
   * HTTP-only, Secure, SameSite=Strict cookie rather than including any body
   * payload. This design follows security best practices to prevent token
   * interception and CSRF attacks.
   *
   * The refresh token, when presented by the client, is validated against the
   * refresh_token_hash stored in the community_platform_user_sessions table.
   * The associated session's is_active status and session_expiry are checked
   * to ensure validity. A new access token is issued and returned, while the
   * refresh token is rotated for session security.
   *
   * This schema intentionally contains no properties because all necessary
   * authentication context is contained within the HTTP request headers
   * (specifically, the refresh token in the cookie). This approach avoids
   * exposing refresh tokens in request bodies and maintains strict separation
   * of concerns.
   *
   * Following the authorization model, this refresh operation is only
   * available to moderator users, who are classified as 'member' kind users
   * requiring the complete authentication flow, including join, login, and
   * refresh.
   */
  export type IRefresh = {};
}

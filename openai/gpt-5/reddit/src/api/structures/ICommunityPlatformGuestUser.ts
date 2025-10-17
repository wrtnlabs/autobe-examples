import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuestUser {
  /**
   * Guest registration inputs sufficient to create a row in
   * Actors.community_platform_users and immediately assign a guest
   * designation via Actors.community_platform_guest_users.
   *
   * This DTO maps to non-null columns on community_platform_users per Prisma
   * schema comments: unique email, unique username, and consent timestamps
   * terms_accepted_at and privacy_accepted_at. The server derives
   * password_hash and initializes account_state/email_verified for a guest
   * session; plaintext passwords are never accepted or stored. Optional
   * marketing consent can be indicated through marketing_opt_in, while the
   * corresponding marketing_opt_in_at is stamped by the server upon opt-in.
   */
  export type IJoin = {
    /**
     * Unique email address used as a primary login identifier for the user,
     * stored in Actors.community_platform_users.email.
     *
     * Per Prisma schema comments, this field is case-insensitive unique and
     * is used for authentication communications and verification flows. The
     * value must be a valid email address format.
     */
    email: string & tags.Format<"email">;

    /**
     * Public handle for the user, stored in
     * Actors.community_platform_users.username.
     *
     * This identifier must be globally unique across the platform and is
     * used for mentions and profile URLs. Business rules typically allow
     * letters, numbers, and underscores within 3–20 characters. Prefer
     * case-insensitive uniqueness at the database layer.
     */
    username: string;

    /**
     * Timestamp when the user accepted the Terms of Service, persisted in
     * Actors.community_platform_users.terms_accepted_at.
     *
     * The Prisma schema uses timestamptz for auditability. This is required
     * to satisfy compliance requirements at registration time.
     */
    terms_accepted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the user accepted the Privacy Policy, persisted in
     * Actors.community_platform_users.privacy_accepted_at.
     *
     * The Prisma schema uses timestamptz for auditability. This is required
     * at registration time to satisfy compliance requirements.
     */
    privacy_accepted_at: string & tags.Format<"date-time">;

    /**
     * Whether the user explicitly opted in to marketing communications,
     * persisted to Actors.community_platform_users.marketing_opt_in.
     *
     * Defaults to false when no opt-in is offered. If true, the provider
     * records a timestamp in marketing_opt_in_at on the server side;
     * clients must not supply that timestamp in this Create DTO.
     */
    marketing_opt_in?: boolean | undefined;
  };

  /** Authorization response for guest user including JWT token information. */
  export type IAuthorized = {
    /** Authenticated user id (community_platform_users.id). */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Role kind for the session. */
    role?: "guestUser" | undefined;
  };

  /** Guest token refresh request payload. */
  export type IRefresh = {
    /** Valid refresh token to renew guest authorization. */
    refresh_token: string;
  };
}

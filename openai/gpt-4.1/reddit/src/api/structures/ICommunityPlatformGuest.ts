import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * DTO for creating a new guest session in the Reddit-like community
   * platform.
   *
   * This type represents the request for creating an ephemeral guest
   * presence. The key field is 'session_key'. It supports optional provision
   * by the front-end and is enforced to be unique in the database. Other
   * properties (such as 'created_at' and 'deleted_at') are not accepted in
   * user input as they are managed automatically by the system. Security:
   * This DTO never accepts personal or sensitive data and strictly creates a
   * minimal tracking artifact for user sessions.
   *
   * Fields must directly correspond to the columns in the
   * 'community_platform_guests' Prisma model for writing new records during
   * guest session initialization.
   */
  export type ICreate = {
    /**
     * Anonymous session or tracking key, for attribution or moderation
     * referencing. Opaque, session-tied. Not globally unique. Possibly
     * device- or IP-bound. Used for ephemeral tracking only.
     */
    session_key: string;
  };

  /**
   * Response DTO for guest session creation or refresh authorization.
   *
   * This object encapsulates a successfully established guest session
   * context, including the system-assigned UUID 'id', the active
   * 'session_key', and the session creation time. If the guest has been
   * pseudo-deleted, 'deleted_at' is set. This is NOT a login token nor a
   * privileged principal—authorization is strictly limited to anonymous
   * navigation and tracking. Sensitive or personal info is never present.
   *
   * All fields are mapped directly from the 'community_platform_guests'
   * schema and must always be included in the response, aligning with
   * business rules that require explicit session representation and audit
   * traceability.
   */
  export type IAuthorized = {
    /** System-assigned unique identifier for this guest session (UUID). */
    id: string & tags.Format<"uuid">;

    /**
     * Anonymous session or tracking key, for ephemeral user session
     * identification and audit.
     */
    session_key: string;

    /**
     * Timestamp when guest record/session was first established (ISO 8601,
     * UTC).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating if this guest session was pseudo-deleted/erased
     * (null if active, string if deleted; ISO 8601, UTC).
     */
    deleted_at: (string & tags.Format<"date-time">) | null;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * DTO for requesting a guest session refresh in the Reddit-like community
   * platform.
   *
   * This schema is used by unauthenticated (guest) users when they need to
   * refresh or extend their access session for anonymous browsing. Either
   * 'session_key' or 'id' must be provided, with 'session_key' preferred for
   * stateless validation flows. The 'id' field is a UUID corresponding to the
   * primary key of the 'community_platform_guests' record.
   *
   * This structure ensures that guest sessions are uniquely identified and
   * can be securely refreshed or expired as necessary. No sensitive or
   * authentication-related information is included, reflecting guests'
   * limited privileges.
   *
   * References: 'community_platform_guests' table in Prisma schema.
   */
  export type IRefresh = {
    /**
     * Unique identifier for the guest session. This is the primary key for
     * the 'community_platform_guests' table and is required for refresh
     * operations if session_key is not provided. Must be a well-formed UUID
     * as per RFC 4122.
     *
     * Example: 'd4b0689e-62c5-4057-aa32-8d5080d59f64'
     */
    id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * The anonymous session or tracking key (opaque string) for this guest
     * user. Tied typically to a device, cookie, or session storage.
     * Required if 'id' is not present, but may be provided for convenience.
     * Must be unique if present and allow platform traceability for
     * anti-abuse or audit purposes.
     *
     * Example: 'guest-session-1697654321-abcd1234efgh5678'
     */
    session_key: string;
  };
}

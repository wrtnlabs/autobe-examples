import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityBbsVisitor {
  /**
   * Create DTO for a guest/visitor session. This request is a combined
   * payload used to create a visitor fingerprint (community_bbs_visitor) and
   * an initial visitor session (community_bbs_visitor_sessions). Server MUST
   * persist visitor and session rows transactionally and MUST NOT rely on a
   * single-model mapping. See x-autobe-prisma-schema-mapping for explicit
   * field->Prisma model mapping.
   */
  export type ICreate = {
    /**
     * Client-observed IP address. Maps to community_bbs_visitor.ip and will
     * also be used to populate the created session record. Nullable if the
     * client cannot supply it; server may infer the IP from the connection.
     * Clients SHOULD provide IP when available for rate-limiting and
     * telemetry.
     */
    ip?: string | null | undefined;

    /**
     * User agent string captured from the client. Maps to
     * community_bbs_visitor.user_agent. Nullable when not available.
     */
    user_agent?: string | null | undefined;

    /**
     * Session-specific metadata that maps to the
     * community_bbs_visitor_sessions row. This nested object clarifies that
     * these properties are persisted to the session table, not to
     * community_bbs_visitor. The operation contract requires href and
     * referrer to be provided by the client for session creation.
     */
    session_context: {
      /**
       * Connection URL / landing href associated with this session. Maps
       * to community_bbs_visitor_sessions.href. Required by session
       * creation; server may reject requests without a valid href.
       */
      href: (string & tags.Format<"uri">) | null;

      /**
       * Referrer URL for the session. Maps to
       * community_bbs_visitor_sessions.referrer. Required by session
       * creation; server may reject requests without a valid referrer.
       */
      referrer: (string & tags.Format<"uri">) | null;

      /**
       * Optional desired session lifetime in seconds. When provided the
       * server may use this to set
       * community_bbs_visitor_sessions.expired_at (subject to platform
       * caps). Nullable to use platform default.
       */
      session_ttl_seconds?:
        | (number & tags.Type<"int32"> & tags.Minimum<0>)
        | null
        | undefined;
    };
  };

  /**
   * Authorized response for visitor refresh. Contains the persisted visitor
   * id and the session id so downstream services can attribute read-only
   * actions. The token property contains access/refresh tokens (see
   * IAuthorizationToken). The server MUST include the active session
   * identifier (community_bbs_visitor_sessions.id) in this response so
   * clients can reference the persisted session for subsequent refresh
   * flows.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the persisted visitor
     * (community_bbs_visitor.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address observed for the visitor session
     * (community_bbs_visitor.ip).
     */
    ip?: string | undefined;

    /**
     * User agent string captured for attribution and analytics
     * (community_bbs_visitor.user_agent). Nullable when not provided.
     */
    user_agent?: string | null | undefined;

    /**
     * Timestamp when this visitor fingerprint was first observed
     * (community_bbs_visitor.first_seen_at).
     */
    first_seen_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Most recent observation time for this visitor fingerprint
     * (community_bbs_visitor.last_seen_at).
     */
    last_seen_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Soft-delete timestamp for visitor record when required by retention
     * or privacy (community_bbs_visitor.deleted_at). Nullable when active.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Identifier of the active visitor session
     * (community_bbs_visitor_sessions.id) associated with the issued
     * refresh credential. Per operation contract this field MUST be present
     * to allow clients to correlate the issued tokens with the persisted
     * session row.
     */
    session_id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Refresh request for guest visitor authorization. The refresh_token is a
   * credential strongly bound to a community_bbs_visitor_sessions row
   * (server-side). Implementations MUST validate the session's expired_at and
   * the linked visitor record deleted_at before issuing a new authorization.
   * Optionally providing session_id (uuid) can help bind the refresh
   * credential to a specific session record.
   */
  export type IRefresh = {
    /**
     * Opaque visitor refresh credential bound to a
     * community_bbs_visitor_sessions record. Server validates this token
     * against the session row and its expired_at.
     */
    refresh_token: string;

    /**
     * Optional session identifier (community_bbs_visitor_sessions.id). When
     * present the server MUST verify the refresh_token is bound to this
     * session.
     */
    session_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional client IP address to assist with abuse detection; when
     * provided it will be compared to the stored community_bbs_visitor.ip
     * for rate-limiting/validation signals.
     */
    ip?: string | undefined;
  };
}

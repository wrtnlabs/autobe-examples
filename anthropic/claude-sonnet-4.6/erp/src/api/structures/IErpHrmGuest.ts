import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IErpHrmGuest {
  /**
   * Request body for renewing a guest JWT access token. Submit the refresh token previously issued by the guest join endpoint to obtain a new access token and refresh token pair without re-joining. The refresh token encodes the guest's session identity, so no additional identifying fields are required.
   */
  export type IRefresh = {
    /**
     * The JWT refresh token previously issued by the guest join or refresh endpoint. Submit this value to obtain a new access token and refresh token pair for the guest session.
     *
     * @x-autobe-specification This field holds the JWT refresh token string issued to the guest during the join flow (POST /erpHrm/auth/guest/join) or a previous refresh. The backend decodes this token to extract the embedded erp_hrm_guest_session_id, queries erp_hrm_guest_sessions to verify the session record exists and that expired_at > now(), and loads the associated erp_hrm_guests record. An invalid, malformed, expired, or orphaned token results in a 401 Unauthorized response. No direct DB column mapping — this is a server-issued opaque credential.
     */
    refresh: string;
  };

  /**
   * Request body for the guest join operation. Supplies the device fingerprint that uniquely identifies the unauthenticated visitor and the session context (page URL, referrer, and optional client IP) used to create a new guest session record. Guests use this endpoint as their platform entry point before registering or logging in as a member.
   */
  export type IJoin = {
    /**
     * Device fingerprint or client-generated identifier that uniquely identifies this unauthenticated visitor. Used to correlate anonymous activity across sessions and to reuse an existing guest record if one already exists.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from erp_hrm_guests.fingerprint. Used to look up an existing guest record via the unique index. If no record is found with this fingerprint, a new erp_hrm_guests row is inserted with a generated UUID and current timestamps.
     */
    fingerprint: string;

    /**
     * Full URL of the page the guest was visiting when they initiated the join request. Recorded in the session for audit and analytics purposes.
     *
     * @x-autobe-specification Stored in erp_hrm_guest_sessions.href upon session creation. Captures the full URL of the page from which the guest initiated the join request. Required for session audit and analytics.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL indicating the page that directed the guest to the current page. Recorded in the session for audit and analytics purposes.
     *
     * @x-autobe-specification Stored in erp_hrm_guest_sessions.referrer upon session creation. Captures the HTTP Referer header value indicating the page that linked to the current page. Required for session audit and analytics.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client's IPv4 address at the time of the join request. Optional — intended for server-side rendering (SSR) environments where the backend cannot directly determine the client IP from the request. If not provided, the server will capture the IP automatically.
     *
     * @x-autobe-specification Stored in erp_hrm_guest_sessions.ip upon session creation. If the client provides this value, it is used directly. If null or absent, the server extracts the client IP from the incoming HTTP request headers (e.g., X-Forwarded-For or remote address). Format must be IPv4.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authorization response returned to a guest actor after a successful join or token refresh operation. Combines the guest's platform identity (id, fingerprint, created_at from erp_hrm_guests) with a JWT token pair (IAuthorizationToken) that authorizes subsequent API access. Guests use token.access as a Bearer token and token.refresh to renew their session before expiry.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest record. A UUID that persists across sessions for the same device fingerprint.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from erp_hrm_guests.id. UUID primary key uniquely identifying the guest record. Auto-generated server-side on first guest creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint or client-generated identifier that uniquely identifies this unauthenticated visitor. Used to correlate guest activity across sessions before account creation or login.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from erp_hrm_guests.fingerprint. The unique device fingerprint or client-generated identifier provided by the client during the join request. Has a unique index in the database.
     */
    fingerprint: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * Timestamp when the guest identity was first created on the platform. Reflects the moment the visitor first identified themselves with this device fingerprint.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from erp_hrm_guests.created_at. Timestamp (with timezone) when the guest record was first created. Set server-side at INSERT time and never changed.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Lightweight summary representation of a guest identity within the ERP HRM platform. A guest represents an unauthenticated visitor identified by a device fingerprint before they register or log in. This summary includes the essential identifying fields — the primary key, the unique fingerprint used to correlate the visitor across pre-authentication sessions, and the timestamp of first registration. It is used as a parent reference within guest session records.
   */
  export type ISummary = {
    /**
     * Unique identifier of the guest record. A UUID assigned by the system when the guest is first registered.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from erp_hrm_guests.id. UUID primary key, auto-generated by the system on guest record creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint or client-generated identifier that uniquely identifies the unauthenticated visitor. Used to correlate guest activity across sessions before account creation or login.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from erp_hrm_guests.fingerprint. Unique NOT NULL string. Used to correlate the unauthenticated visitor across pre-authentication sessions.
     */
    fingerprint: string;

    /**
     * Timestamp indicating when the guest record was first created. ISO 8601 date-time string in UTC.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from erp_hrm_guests.created_at (Timestamptz NOT NULL). Represents the moment the guest record was first persisted in the database.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}

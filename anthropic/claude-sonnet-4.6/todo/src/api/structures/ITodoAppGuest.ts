import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Request body for exchanging a guest refresh token for a new pair of JWT access and refresh tokens.
   *
   * The client provides the refresh token previously issued during the guest join or a prior refresh operation. The server validates the token's signature and expiry, looks up the associated guest identity and session, and returns a fresh set of tokens if the session is still valid.
   *
   * If the refresh token is expired, invalid, or tampered with, the request is rejected with a 401 Unauthorized response and the client must initiate a new guest join flow.
   */
  export type IRefresh = {
    /**
     * The JWT refresh token previously issued to this guest actor during the join or a prior refresh operation. Submit this token to obtain a new pair of access and refresh tokens. If this token is expired, invalid, or has been tampered with, the request will be rejected with 401 Unauthorized and the guest must perform a new join.
     *
         * @x-autobe-specification Client-provided JWT refresh token string. The
         *   backend validates the token's signature and expiry, then extracts
         *   guest_id and session_id from its claims. It looks up
         *   todo_app_guests by guest_id and verifies the corresponding
         *   todo_app_guest_sessions row has expired_at > now(). On success, a
         *   new access/refresh token pair is issued. This field has no direct
         *   mapping to any database column — it is a credential input processed
         *   entirely server-side.
     */
    refreshToken: string;
  };

  /**
   * Request body for registering or retrieving a guest account via a device fingerprint and initiating an anonymous session.
   *
   * Provide the unique device fingerprint that identifies the anonymous client device. If a guest record already exists for the fingerprint, the system recognises the returning visitor and updates the record; otherwise a new guest account is created. The additional session context fields (`href`, `referrer`, `ip`) are captured alongside the fingerprint and persisted in the guest session record for audit and analytics purposes.
   */
  export type IJoin = {
    /**
     * A unique anonymous identifier string that identifies the visitor's client device. Used to recognise returning guests and associate the session with a persistent guest identity. Must not be empty.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping to
         *   todo_app_guests.device_fingerprint. Used to look up or create a
         *   guest record via upsert on the @@unique([device_fingerprint])
         *   constraint. Must be a non-empty string; reject with HTTP 400 if
         *   blank or null.
     */
    device_fingerprint: string & tags.MinLength<1>;

    /**
     * The full URL of the page from which the guest join request originated. Captured for session tracking and stored in the guest session record.
     *
         * @x-autobe-specification Written to todo_app_guest_sessions.href when
         *   creating the new session record. Captures the full URL of the page
         *   where the guest join was initiated. Not stored on todo_app_guests
         *   itself.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referrer URL indicating the page that directed the visitor to the current page, or null if no referrer is available. Captured for session analytics and stored in the guest session record.
     *
         * @x-autobe-specification Written to todo_app_guest_sessions.referrer
         *   when creating the new session record. Nullable — the client should
         *   send null when the HTTP Referer header is absent. Not stored on
         *   todo_app_guests itself.
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * The IPv4 address of the client initiating the guest join, if known by the client. Optional — when absent, the server automatically captures the remote IP address from the network connection.
     *
         * @x-autobe-specification Written to todo_app_guest_sessions.ip when
         *   creating the new session record. Optional in the request body
         *   because in SSR scenarios the client-side code cannot reliably
         *   determine the public IP; the server captures the remote IP as a
         *   fallback when this field is omitted or null. Not stored on
         *   todo_app_guests itself.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authorized guest session response returned after a successful guest join or token refresh operation.
   *
   * This type bundles the guest identity record — identified by the unique `device_fingerprint` of the visitor's client device — together with a pair of JWT tokens required for subsequent authenticated requests. The `token` object carries a short-lived access token for immediate API access and a long-lived refresh token for silent session renewal.
   *
   * This is the sole token-bearing response type for guest actors. Consumers should store the `token.access` value and present it as a Bearer token in subsequent requests, and use `token.refresh` when the access token expires by calling the refresh endpoint.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account. A UUID assigned when the guest record is first created.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from todo_app_guests.id. UUID
         *   primary key auto-generated on guest record creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The device fingerprint string that uniquely identifies the anonymous visitor's client device. This value was provided during the guest join request and is stored with a unique constraint.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from
         *   todo_app_guests.device_fingerprint. Unique string identifying the
         *   anonymous client device. Subject to @@unique constraint.
     */
    device_fingerprint: string;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;

    /**
     * ISO 8601 timestamp of when the guest account was first created, corresponding to the visitor's first anonymous access to the system.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   todo_app_guests.created_at. Timestamptz set when the guest record
         *   was first created (i.e., first anonymous visit).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * ISO 8601 timestamp of the most recent update to the guest record, refreshed each time the same device fingerprint performs a join or the record is otherwise modified.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   todo_app_guests.updated_at. Timestamptz updated on every upsert
         *   (i.e., each time the same device fingerprint joins again).
     */
    updated_at: string & tags.Format<"date-time">;
  };
}

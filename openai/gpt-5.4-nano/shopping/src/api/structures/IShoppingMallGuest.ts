import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallGuest {
  /**
   * Request payload used by a client (visitor) to create or locate a temporary guest identity and bootstrap a guest session so the visitor can interact with guest-only features. The server uses the device fingerprint to identify the guest and stores request context (origin/referrer and optional IP) into a guest session record, then returns authentication tokens in the authorized response.
   */
  export type IJoin = {
    /**
     * Stable device fingerprint identifying the same anonymous guest across requests.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from IShoppingMallGuest.IJoin.fingerprint to shopping_mall_guests.fingerprint (unique). Use it to find-or-create the shopping_mall_guests row within the join transaction.
     */
    fingerprint: string;

    /**
     * Origin or request URL captured when the guest session is established.
     *
     * @x-autobe-specification Persist IShoppingMallGuest.IJoin.href into shopping_mall_guest_sessions.href when inserting the guest session for the joined/located guest.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL captured when the guest session is established.
     *
     * @x-autobe-specification Persist IShoppingMallGuest.IJoin.referrer into shopping_mall_guest_sessions.referrer when inserting the guest session for the joined/located guest.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address captured at session establishment; may be null if unavailable on the client side.
     *
     * @x-autobe-specification Persist IShoppingMallGuest.IJoin.ip into shopping_mall_guest_sessions.ip when inserting the guest session for the joined/located guest. If the client sends null, the server should use a safe fallback per implementation policy (e.g., derive from request metadata) and still store an IP value compatible with the DB column constraints.
     */
    ip: (string & tags.Format<"ipv4">) | null;
  };

  /**
   * Guest refresh request DTO used by the guest token refresh endpoint. In the current loaded schema it is defined as an empty request body placeholder; the actual required credential fields must be taken from the definitive interface schema source of truth.
   */
  export type IRefresh = {};

  /**
   * Authorized guest response containing the active guest session identity, validity metadata, and connection context used to authenticate subsequent requests under the guest actor scope.
   */
  export type IAuthorized = {
    /**
     * Guest session identifier (UUID) used internally to reference the current guest session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping: return shopping_mall_guest_sessions.id for the active session row associated with the guest request.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address captured when the guest session was created.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_guest_sessions.ip (client IP captured at session establishment).
     */
    ip: string;

    /**
     * Request origin/URL context captured when establishing the guest session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_guest_sessions.href (request URL/origin context stored at session establishment).
     */
    href: string;

    /**
     * HTTP referrer captured when establishing the guest session.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_guest_sessions.referrer (HTTP referrer URL captured at session establishment).
     */
    referrer: string;

    /**
     * Timestamp when the guest session record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping: return shopping_mall_guest_sessions.created_at timestamp.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest session record was last updated (e.g., during refresh/token rotation).
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping: return shopping_mall_guest_sessions.updated_at timestamp.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when the guest session/access is no longer valid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping: return shopping_mall_guest_sessions.expired_at as the access/session expiry timestamp.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Soft-delete timestamp for the guest session; null when the session is active/not deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from shopping_mall_guest_sessions.deleted_at. If the session is not soft-deleted, return null.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}

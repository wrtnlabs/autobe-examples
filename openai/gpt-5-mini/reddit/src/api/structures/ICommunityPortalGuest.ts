import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPortalGuest {
  /**
   * Request DTO for creating a guest session recorded in the
   * community_portal_guests Prisma table.
   *
   * This object intentionally contains no client-supplied actor or
   * system-managed fields. The server MUST generate the guest session record
   * server-side and populate id, guest_token, created_at, and expired_at.
   * Association to an existing user (if applicable) must be performed
   * server-side based on authenticated context or explicit server-side
   * binding flows; clients MUST NOT supply user_id, author_id, or other actor
   * identifiers in this Create DTO.
   *
   * Notes:
   *
   * - Do not include password or any sensitive user credential in this payload.
   * - The server is responsible for generating the guest_token, id, created_at
   *   and expired_at fields.
   */
  export type ICreate = {};

  /**
   * Authorized response returned after successful guest-join or guest-refresh
   * operations.
   *
   * This object reflects the persisted community_portal_guests record and
   * includes the server-generated id, the bound user_id (if any), the issued
   * guest_token, and timestamps for creation and expiry. The server MUST NOT
   * return sensitive user authentication data such as password_hash. Clients
   * use guest_token as a bearer credential for guest-scoped access until
   * expired_at.
   *
   * Behavioral notes:
   *
   * - Guest_token MUST be treated as a secret by clients and stored according
   *   to security best-practices for short-lived credentials.
   * - The server is responsible for token rotation on refresh and must update
   *   expired_at accordingly.
   * - When x-autobe-prisma-schema is present, every property in this schema
   *   corresponds to an actual column in the Prisma model
   *   community_portal_guests.
   */
  export type IAuthorized = {
    /**
     * Primary key of the guest session record in community_portal_guests.
     * This is a server-assigned UUID identifying the created guest
     * session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the associated community_portal_users.id. This field
     * reflects the user association recorded on the guest session. If the
     * guest session was created bound to a user, this contains that user's
     * UUID.
     */
    user_id: string & tags.Format<"uuid">;

    /**
     * Cryptographically-secure token issued for the guest session. This
     * token is the credential the client will present for
     * guest-authenticated requests and MUST be treated as sensitive by
     * clients (store in memory or short-lived storage).
     */
    guest_token: string;

    /**
     * Timestamp (UTC) when the guest session record was created in the
     * database (community_portal_guests.created_at).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Expiration timestamp for the issued guest_token
     * (community_portal_guests.expired_at). This field may be null if the
     * server represents non-expiring sessions (rare); clients SHOULD treat
     * null as indefinite or consult server policies. Typically this
     * contains an ISO 8601 date-time in UTC after which the token must be
     * considered invalid.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Payload to refresh a guest session.
   *
   * This object represents the request body for the guest token refresh
   * endpoint. It contains the single required property guest_token which maps
   * to community_portal_guests.guest_token in the Prisma schema. The server
   * will validate the token, ensure the corresponding record's expired_at has
   * not lapsed, and (where applicable) rotate the token and update
   * expired_at.
   *
   * Only the guest_token is required for this request. No passwords or other
   * PII are accepted in this payload.
   */
  export type IRefresh = {
    /**
     * Guest session token issued by POST /auth/guest/join and stored in
     * community_portal_guests.guest_token.
     *
     * This token is a cryptographically-secure opaque string that the
     * server validates against the community_portal_guests table. Clients
     * MUST present this token when calling the guest refresh operation. The
     * server MUST reject requests with unknown or expired tokens.
     */
    guest_token: string;
  };
}

import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IErpHrmTimeTrackingGuest {
  /**
   * Guest authorization response payload returned after successful guest authentication (join) or token renewal (refresh). Contains the guest identity identifier and the issued JWT authorization token set needed for authenticated calls.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest identity for subsequent authenticated interactions.
     *
     * @x-autobe-specification Set `id` to the identifier of the guest identity that the server validated for this request (during join: the created/correlated guest identity; during refresh: the guest identity associated with the provided refresh token's guest session). The value is the same guest identity id used to correlate subsequent auth refresh validation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Guest join / sign-in bootstrap payload used by unauthenticated clients to validate identity via email + password and begin the guest authentication workflow. On success, the server issues guest access/refresh tokens.
   */
  export type IJoin = {
    /**
     * Guest account email address used to locate the guest identity for sign-in.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Use request.email as the lookup key for erp_hrm_time_tracking_guests.email. Treat it as the identifier for finding the guest identity record. Authenticate only against active identities (deleted_at is null).
     */
    email: string & tags.Format<"email">;

    /**
     * Guest sign-in password. Sent by the client for server-side credential verification only.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Treat request.password as plaintext from the client. Verify it against the stored erp_hrm_time_tracking_guests.password_hash using the server's password hashing/verification routine. Never persist plaintext password and never return plaintext password or password_hash in any response payload for this endpoint.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Guest identity summary for anonymous access correlation in list views. Includes the guest's unique identifier, email address, and timestamps; deleted_at is null for active guests and a timestamp for soft-deleted guests.
   */
  export type ISummary = {
    /**
     * Guest identity unique identifier (UUID).
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from erp_hrm_time_tracking_guests.id. Use as the guest identity primary key/UUID in this DTO.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Guest email address used for anonymous access correlation.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from erp_hrm_time_tracking_guests.email. Persisted email used to correlate guest join/login workflows.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the guest identity record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from erp_hrm_time_tracking_guests.created_at. Projection includes it as-is for audit/display purposes.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest identity record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from erp_hrm_time_tracking_guests.updated_at. Projection includes it as-is to reflect the last identity update time.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp for the guest identity; null means the guest is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from erp_hrm_time_tracking_guests.deleted_at. If null, the guest identity is active; if a timestamp, it is soft-deleted.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Payload sent by an unauthenticated guest to renew authentication tokens. The client must provide the refresh token previously issued for an existing guest session so the server can validate it and issue a new authorization result.
   */
  export type IRefresh = {
    /**
     * The refresh token value previously issued by the service for this guest session. Send only to the guest refresh endpoint.
     *
     * @x-autobe-specification Secret input. Provide the refresh token value previously issued by the service for the guest session being refreshed. Backend must validate expiry/signature, locate the associated guest session in erp_hrm_time_tracking_guest_sessions, ensure it is linked to a guest identity in erp_hrm_time_tracking_guests, and then proceed with token renewal (with optional rotation/revocation).
     */
    refreshToken: string;
  };
}

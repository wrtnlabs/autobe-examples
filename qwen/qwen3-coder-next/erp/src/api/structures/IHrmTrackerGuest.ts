import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmTrackerGuest {
  /**
   * Guest authorization response containing identification and session tokens for unauthenticated users.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.id. UUID primary key identifying the guest account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique device fingerprint identifying the guest's device.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.device_fingerprint. Unique device identifier used for guest identification.
     */
    device_fingerprint: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for guest token refresh operation containing device identifier, refresh token, and session context (href, referrer) for security auditing.
   */
  export type IRefresh = {
    /**
     * Unique device identifier that identifies the guest's device.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.device_fingerprint. Unique identifier for guest device.
     */
    device_fingerprint: string;

    /**
     * Long-lived refresh token for obtaining new access tokens.
     *
     * @x-autobe-specification Refresh token from session context. Used to validate and generate new access tokens without re-authentication.
     */
    refresh_token: string & tags.Format<"password">;

    /**
     * The URL of the page that linked to the authentication endpoint.
     *
     * @x-autobe-specification Session context: HTTP referer header captured during token generation. Used for security auditing.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * The URL of the page that linked to the authentication endpoint (alternative field name).
     *
     * @x-autobe-specification Session context: HTTP referrer header captured during token generation. Used for security auditing.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Request body for guest registration endpoint.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property device_fingerprint
     */
    device_fingerprint: string;
    /**
     * @x-autobe-database-schema-property email
     */
    email: (string & tags.Format<"email">) | null;

    /**
     * User's password for authentication.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plaintext password for auth. Server hashes and verifies.
     */
    password: (string & tags.Format<"password">) | null;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Summary representation of a guest actor for activity logs, containing essential identification information.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.id. Primary key identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address for guest authentication, null if not yet set during registration flow.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.email. Nullable because guests may not have set email yet during pre-authentication state.
     */
    email: string | null;

    /**
     * Timestamp when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from hrm_tracker_guests.created_at. Timestamp when the guest record was created.
     */
    created_at: string & tags.Format<"date-time">;
  };
}

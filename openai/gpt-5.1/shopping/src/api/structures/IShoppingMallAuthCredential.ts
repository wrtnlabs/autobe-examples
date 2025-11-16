import { tags } from "typia";

export namespace IShoppingMallAuthCredential {
  /**
   * Summary view of authentication credential metadata for an actor on the
   * shopping mall platform, intended for administrative and security
   * dashboards. This DTO exposes only non-secret credential information that
   * is safe to show to platform administrators when inspecting the
   * authentication state of a seller or platform administrator. It omits any
   * sensitive secret material such as password hashes, salts, raw tokens, or
   * refresh tokens.
   */
  export type ISummary = {
    /**
     * Unique identifier of the authentication credential record in the
     * shopping_mall_auth_credentials table.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Logical actor type that owns this credential, such as customer,
     * seller, or platformAdmin. This is used to understand which kind of
     * account the credential belongs to for audit and security purposes.
     */
    actor_type: string;

    /**
     * Unique identifier of the owning actor in its respective table (for
     * example shopping_mall_seller, shopping_mall_customer, or
     * shopping_mall_platformadmin).
     */
    actor_id: string & tags.Format<"uuid">;

    /**
     * Type of credential used for authentication, such as email_password,
     * oauth2, or external_idp. Useful for understanding how this actor
     * authenticates to the platform.
     */
    credential_type: string;

    /**
     * Human-readable credential identifier such as login email or external
     * identity handle. This must never include any secret values and should
     * be safe for display in administrative UIs.
     */
    identifier: string;

    /**
     * Indicates whether this credential is currently active and allowed to
     * be used for authentication. When false, login attempts using this
     * credential should be rejected.
     */
    is_active: boolean;

    /**
     * Indicates whether the credential is temporarily locked due to
     * security reasons such as repeated failed login attempts. Locked
     * credentials typically require an explicit unlock or cooldown period
     * before reuse.
     */
    is_locked: boolean;

    /**
     * Indicates whether this credential has been administratively disabled.
     * Disabled credentials cannot be used for authentication until
     * explicitly re-enabled by an authorized administrator.
     */
    is_disabled: boolean;

    /**
     * Timestamp of the last successful authentication using this
     * credential, in ISO 8601 date-time format. Null when the credential
     * has never successfully authenticated.
     */
    last_success_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp of the last failed authentication attempt using this
     * credential, in ISO 8601 date-time format. Null when there has been no
     * recorded failure.
     */
    last_failure_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Number of consecutive failed authentication attempts since the last
     * successful login or reset. Used in account lockout and risk
     * evaluation logic.
     */
    failure_count: number & tags.Type<"int32">;

    /**
     * Optional high-level risk assessment label for this credential derived
     * from shopping_mall_risk_flags, such as low, medium, or high. Null
     * when no explicit risk classification is present.
     */
    risk_level?: string | null | undefined;

    /**
     * List of textual risk flags or codes associated with this credential,
     * consolidated from related records such as shopping_mall_risk_flags.
     * Used by administrators to quickly see why a credential is considered
     * risky.
     */
    risk_flags?: string[] | undefined;
  };
}

import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconDiscussVerifiedExpert {
  /**
   * Authorization response payload for the Verified Expert context.
   *
   * Includes the subject id (UUID), a role indicator fixed to
   * "verifiedExpert", and a token bundle describing the current session.
   * Mirrors select non-sensitive identity fields from econ_discuss_users for
   * immediate client configuration while strictly omitting confidential
   * columns (password_hash, mfa_secret, mfa_recovery_codes) and any
   * soft-delete internals (deleted_at).
   *
   * All timestamps are provided in ISO 8601 format. Ownership and actor
   * identity are derived from token claims; clients MUST NOT infer ownership
   * from arbitrary request bodies.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated account
     * (econ_discuss_users.id).
     *
     * Used as the subject for subsequent API calls and embedded in token
     * claims.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Logical authorization role for this session.
     *
     * For this payload the value is fixed to "verifiedExpert" to indicate
     * expert context. Role assignment is ultimately derived from the
     * presence of expert verification records
     * (econ_discuss_verified_experts) and policy, but this field
     * communicates the active context to the client.
     */
    role: "verifiedExpert";

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Whether the account’s email address has been verified
     * (econ_discuss_users.email_verified).
     *
     * Some write actions are gated until this is true.
     */
    email_verified: boolean;

    /**
     * Whether multi-factor authentication is enabled for this account
     * (econ_discuss_users.mfa_enabled).
     *
     * MFA enforcement policies may require second factor during sensitive
     * actions.
     */
    mfa_enabled: boolean;

    /**
     * Public display handle (econ_discuss_users.display_name) returned for
     * convenience in the authorization envelope.
     */
    display_name: string;

    /**
     * Avatar image URI (econ_discuss_users.avatar_uri) if configured; null
     * otherwise.
     *
     * Excluded from token contents; included here for client convenience.
     */
    avatar_uri?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Preferred IANA timezone identifier (econ_discuss_users.timezone),
     * e.g., "Asia/Seoul".
     *
     * Null indicates no preference set.
     */
    timezone?: string | null | undefined;

    /**
     * Preferred locale (econ_discuss_users.locale), e.g., "en-US" per BCP
     * 47.
     *
     * Null indicates no preference set.
     */
    locale?: string | null | undefined;

    /**
     * Account creation timestamp (econ_discuss_users.created_at).
     *
     * Serialized as ISO 8601 with timezone offset.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Account last update timestamp (econ_discuss_users.updated_at).
     *
     * Serialized as ISO 8601 with timezone offset.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}

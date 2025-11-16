import { tags } from "typia";

export namespace IShoppingMallEmailVerificationToken {
  /**
   * Search and filter DTO for querying email verification tokens belonging to
   * a specific authentication credential.
   *
   * This type is used as the request body for the PATCH
   * /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/emailVerificationTokens
   * endpoint, enabling platform administrators to filter tokens by status,
   * email address, and time windows while also controlling pagination and
   * sorting.
   *
   * It does not map directly to a single Prisma model table because it
   * represents query parameters rather than a persisted entity.
   */
  export type IRequest = {
    /**
     * Page number for paginated results.
     *
     * Defaults to 1 when omitted. Combined with pageSize to determine the
     * offset into the email verification token result set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of email verification token records to return per page.
     *
     * Implementations should enforce an upper bound (for example 100 or
     * 200) to prevent excessively large result sets that could harm
     * performance.
     */
    pageSize?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Optional filter for token status.
     *
     * Typical statuses include pending, verified, and expired. Used by
     * administrators to quickly locate tokens in a particular lifecycle
     * state.
     */
    status?: string | null | undefined;

    /**
     * Optional filter for the email address associated with the token.
     *
     * Implementations may support exact match, prefix match, or substring
     * search depending on business requirements. Used to narrow results to
     * verification tokens for a specific email.
     */
    email?: string | null | undefined;

    /**
     * Lower bound (inclusive) for the token issuance time range filter.
     *
     * Only tokens with issuedAt greater than or equal to this value should
     * be included in the results.
     */
    issuedFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound (inclusive) for the token issuance time range filter.
     *
     * Only tokens with issuedAt less than or equal to this value should be
     * included in the results.
     */
    issuedTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound filter for token expiration.
     *
     * Only email verification tokens whose expiration timestamp is earlier
     * than or equal to this value should be included.
     */
    expiresBefore?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound filter for token expiration.
     *
     * Only email verification tokens whose expiration timestamp is later
     * than or equal to this value should be included.
     */
    expiresAfter?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Field name to sort results by.
     *
     * Common options include issuedAt and expiresAt. Implementations should
     * validate this field against an allowed set of sortable columns to
     * avoid unsafe dynamic ordering.
     */
    sortBy?: string | null | undefined;

    /**
     * Sort direction for the result set.
     *
     * Expected values are asc for ascending or desc for descending. When
     * omitted, implementations commonly default to desc to show newest
     * tokens first.
     */
    sortOrder?: string | null | undefined;
  };

  /**
   * Summary view of an email verification token issued for an actor in the
   * shopping mall platform.
   *
   * This DTO intentionally exposes only non-sensitive metadata such as
   * identifiers and timestamps. It never includes the raw verification
   * `token` value from the underlying
   * `shopping_mall_email_verification_tokens` table, ensuring that
   * verification secrets cannot be reconstructed from API responses or logs.
   */
  export type ISummary = {
    /**
     * Unique identifier of the email verification token record.
     *
     * This value is the primary key of the
     * `shopping_mall_email_verification_tokens` Prisma model and is used
     * only for administrative lookup and troubleshooting in privileged
     * tooling.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp indicating when this verification token expires and becomes
     * invalid for completing email verification.
     *
     * The value maps directly to the `expires_at` column in the
     * `shopping_mall_email_verification_tokens` table and is returned as an
     * ISO 8601 date-time string in UTC.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this email verification token record was created.
     *
     * This value comes from the `created_at` column of the
     * `shopping_mall_email_verification_tokens` table and allows
     * administrators to understand when the verification flow was
     * initiated.
     */
    created_at: string & tags.Format<"date-time">;
  };
}

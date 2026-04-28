import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IErpHrmTimeTrackingMember {
  /**
   * Lightweight member summary for UI list/directory views. Includes member identity (id, email) and record timestamps, including soft-delete marker (deleted_at). This DTO intentionally excludes authentication credential material.
   */
  export type ISummary = {
    /**
     * Unique identifier of the member account.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.id. Treat as immutable identifier for
         *   the member across the API.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member email address used as the login identifier.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.email. Return as stored; no masking
         *   is required because this is a public identity attribute used for
         *   directory/UI display.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the member record was created.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.created_at. Returned in ISO 8601
         *   date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the member record was last updated.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.updated_at. Returned in ISO 8601
         *   date-time format.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp. Null when the member is active; non-null when the member is soft-deleted.
     *
         * @x-autobe-database-schema-property deleted_at
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.deleted_at. If null, the member is
         *   active; if non-null, the member is soft-deleted. List endpoints may
         *   choose to default-filter soft-deleted members, but the DTO supports
         *   both states.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Successful authentication result for the `member` actor. Returns the authenticated member identifier and the issued JWT access/refresh tokens (with expiration metadata) for subsequent authenticated API calls.
   */
  export type IAuthorized = {
    /**
     * The authenticated member’s unique identifier (UUID).
     *
         * @x-autobe-specification Set `id` to the authenticated member’s
         *   `erp_hrm_time_tracking_members.id` (UUID) determined during
         *   join/login/refresh after successful credential/session validation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request DTO for searching, sorting, and paginating member (employee) directory results inside the currently selected organization context. It contains only browsing criteria; authentication and organization scoping are applied by the server.
   */
  export type IRequest = {
    /**
     * Free-text query used to match members in the directory (at minimum against email; additional fields may be included by implementation).
     *
         * @x-autobe-specification If `search` is provided (non-empty), apply a
         *   predicate against supported member directory fields at minimum
         *   `email` (e.g., ILIKE/contains). If additional member display fields
         *   exist in implementation, include them consistently in the same
         *   search behavior. Treat `search` as tenant-scoped: apply tenant
         *   filtering first, then search within that scope.
     */
    search?: string | undefined;

    /**
     * Field name to sort the directory results by. Must be one of the sortable fields supported by the server.
     *
         * @x-autobe-specification If `sortBy` is provided, validate it against
         *   a server-side whitelist of sortable directory fields. Map the
         *   provided `sortBy` value to a concrete member-table field/expression
         *   for ORDER BY. If omitted, use a stable default ordering defined by
         *   implementation (e.g., created_at desc or email asc).
     */
    sortBy?: string | undefined;

    /**
     * Sort direction for the selected `sortBy` (asc or desc).
     *
         * @x-autobe-specification If `sortOrder` is provided, apply it to ORDER
         *   BY direction for the selected `sortBy` (asc = ascending, desc =
         *   descending). If omitted, use the implementation default for the
         *   chosen `sortBy` (commonly ascending).
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * 1-based page number for pagination (page 1 is the first page).
     *
         * @x-autobe-specification Pagination control using 1-based numbering.
         *   Validate `page >= 1`. Compute offset as (page - 1) * limit (or
         *   equivalent cursor-based approach as implemented) after applying
         *   tenant scoping, search, and sorting.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of directory items to return for the requested page.
     *
         * @x-autobe-specification Pagination page-size control. Validate `limit
         *   >= 1` and enforce system maximums (the schema caps at 100;
         *   implementation may apply stricter max). Apply it after
         *   filtering/sorting to determine the maximum number of records
         *   returned in the current page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Credential payload used by an unauthenticated client to log in as a member. The server verifies the email/password against stored member credentials and, on success, issues authorization tokens (handled by the login endpoint response schema).
   */
  export type ILogin = {
    /**
     * Member email address used as the login identifier.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_time_tracking_members.email. The login implementation must
         *   query the member by exact email match (after applying any
         *   normalization rules required by the system). Validate format as an
         *   email (format: email). Soft-deleted members (deleted_at != null)
         *   must be treated as unavailable for login.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password provided by the member for authentication (verified server-side against the stored password hash).
     *
         * @x-autobe-specification Client-provided plain-text password. The
         *   login implementation must verify this value against
         *   erp_hrm_time_tracking_members.password_hash using the configured
         *   password hashing algorithm (e.g., bcrypt/argon2) and a
         *   constant-time comparison where applicable. This DTO must not accept
         *   password_hash and must not expose any server-managed credential
         *   material.
     */
    password: string;
  };

  /**
   * Request payload for registering a new authenticated member account, containing login credentials and the tenant/bootstrap + session context needed for initial signup workflow.
   */
  export type IJoin = {
    /**
     * Member account email address used as the login identifier.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Normalize email (trim and lowercase as
         *   required), validate formatting and uniqueness at persistence time,
         *   then store into erp_hrm_time_tracking_members.email.
     */
    email: string & tags.Format<"email">;

    /**
     * Raw password used to create the member account. Stored securely as a hash on the server.
     *
         * @x-autobe-database-schema-property password_hash
         * @x-autobe-specification Validate password against the service’s
         *   password rules, hash it (e.g., bcrypt/argon) and persist only the
         *   resulting hash into erp_hrm_time_tracking_members.password_hash.
         *   Never echo password or password_hash in responses.
     */
    password: string;

    /**
     * Name of the initial organization (tenant) to create for this member.
     *
         * @x-autobe-specification Use this value in the join workflow/service
         *   layer to create the initial organization (tenant) and associate the
         *   newly created member with it. This field does not map to a direct
         *   column in erp_hrm_time_tracking_members.
     */
    organizationName: string;

    /**
     * Description of the initial organization (tenant).
     *
         * @x-autobe-specification Use this value in the join workflow/service
         *   layer when creating the initial organization (tenant). This field
         *   does not map to a direct column in erp_hrm_time_tracking_members.
     */
    organizationDescription: string;

    /**
     * Optional URL of the organization logo.
     *
         * @x-autobe-specification If provided, use as the logo URL when
         *   creating the initial organization (tenant) in the service layer; if
         *   null, create the tenant without a logo. Not mapped to a direct
         *   column in erp_hrm_time_tracking_members.
     */
    organizationLogoUrl?: string | null | undefined;

    /**
     * Organization currency code used for financial/time reporting context.
     *
         * @x-autobe-specification Use this value in the join workflow/service
         *   layer to initialize the organization currency configuration. Not
         *   mapped to a direct column in erp_hrm_time_tracking_members.
     */
    organizationCurrencyCode: string;

    /**
     * Organization timezone used to interpret and display time values.
     *
         * @x-autobe-specification Use this value in the join workflow/service
         *   layer to initialize timezone interpretation for the organization.
         *   Not mapped to a direct column in erp_hrm_time_tracking_members.
     */
    organizationTimezone: string;

    /**
     * Fiscal year start month (1-12) for the organization.
     *
         * @x-autobe-specification Use this integer (1-12) in the join
         *   workflow/service layer when initializing the organization’s fiscal
         *   start month. Not mapped to a direct column in
         *   erp_hrm_time_tracking_members.
     */
    organizationFiscalStartMonth: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>;

    /**
     * Navigation URL (where the join was initiated) used for session/verification context.
     *
         * @x-autobe-specification Treat href as navigation context used by the
         *   join workflow to persist session/verification context metadata. Not
         *   mapped to a direct column in erp_hrm_time_tracking_members.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL used for session/verification context.
     *
         * @x-autobe-specification Treat referrer as referrer context used by
         *   the join workflow to persist session/verification context metadata.
         *   Not mapped to a direct column in erp_hrm_time_tracking_members.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional client IP address used for session/verification context metadata.
     *
         * @x-autobe-specification If ip is provided, store it as part of
         *   session/verification context metadata in the session/workflow
         *   persistence layer. If ip is null, the service should use a
         *   server-captured fallback IP value. Not mapped to a direct column in
         *   erp_hrm_time_tracking_members.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request payload used by a member to refresh authentication tokens. Clients send the refresh token they previously received; the server validates the token against the persisted member session and returns a renewed token pair.
   */
  export type IRefresh = {
    /**
     * The refresh token credential previously issued to the member. The server validates this token against the member’s persisted session to renew authentication.
     *
         * @x-autobe-specification Accept the provided refreshToken string from
         *   the client, then validate it by locating the matching member
         *   session record in erp_hrm_time_tracking_member_sessions. Ensure the
         *   matched session is still valid (not expired and not revoked) and
         *   that its associated member exists/is eligible via
         *   erp_hrm_time_tracking_members. Use the successful session
         *   validation to mint new access/refresh tokens for
         *   IErpHrmTimeTrackingMember.IAuthorized. On failure, reject with an
         *   unauthorized error.
     */
    refreshToken: string;
  };
}

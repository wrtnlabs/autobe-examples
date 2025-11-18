import { tags } from "typia";

export namespace IShoppingMallActorSearch {
  /**
   * Request DTO for performing a unified cross-actor search over customers,
   * sellers, admins, and guest users.
   *
   * This type encapsulates complex filter criteria, pagination configuration,
   * and sorting hints needed by the search engine that composes results from
   * multiple actor-related Prisma models. It allows administrators and
   * internal operators to locate actors by contact information, identifiers,
   * status flags, and registration periods in a single API call.
   *
   * Fields are intentionally optional so that callers can supply only the
   * filters relevant to their use case while still controlling page size and
   * sorting semantics.
   */
  export type IRequest = {
    /**
     * Optional free-text query applied across common actor fields.
     *
     * The search implementation may match this value against names, emails,
     * phone numbers, or other indexed textual fields across customers,
     * sellers, admins, and guest users to provide a broad discovery
     * capability.
     */
    query?: string | null | undefined;

    /**
     * Optional list of actor types to restrict the search to.
     *
     * Typical values are the canonical actor categories used by the
     * platform, such as `customer`, `seller`, `admin`, and `guestuser`.
     * These values are case-sensitive and must match the actor-type
     * dimension used in the underlying Prisma tables and search index.
     *
     * When provided, only actors whose type is included in this list are
     * considered. When null or omitted, all supported actor types are
     * eligible. Back-end validation should reject unsupported actor type
     * values rather than silently ignoring them.
     */
    actor_types?: string[] | null | undefined;

    /**
     * Optional list of email addresses to filter by.
     *
     * If specified, the search narrows results to actors whose primary
     * email matches one of the provided values, enabling precise lookup for
     * support or investigation workflows. Each entry must be a
     * syntactically valid email address.
     */
    emails?: (string & tags.Format<"email">)[] | null | undefined;

    /**
     * Optional list of phone numbers to filter actors by.
     *
     * The exact normalization rules are implementation-specific, but
     * typical usage is to supply fully formatted international numbers to
     * locate actors by their registered contact number. Implementations
     * should document the expected phone number format (for example E.164)
     * and apply consistent normalization before matching.
     */
    phone_numbers?: string[] | null | undefined;

    /**
     * Optional high-level status filter applied uniformly across actor
     * types.
     *
     * Common values include `active`, `suspended`, `disabled`, and
     * `under_review`, reflecting business policy configuration for account
     * lifecycle and risk handling. The exact set of allowed statuses is
     * governed by policy, and callers should only use documented values.
     *
     * When null, actors of any status may be returned. Back-end validation
     * should reject unknown status values to avoid silently returning
     * misleading results.
     */
    status?: string | null | undefined;

    /**
     * Optional lower bound for actor registration time.
     *
     * When provided, only actors whose registration timestamp is greater
     * than or equal to this value are included in results, supporting
     * time-windowed investigations and reporting. The value must be an ISO
     * 8601 date-time string in UTC (for example `2025-01-01T00:00:00Z`).
     */
    registered_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional upper bound for actor registration time.
     *
     * When provided together with `registered_from`, it defines a closed
     * registration date range for the search. Used alone, it limits results
     * to actors created before this point in time. The value must be an ISO
     * 8601 date-time string in UTC.
     */
    registered_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * 1-based page index for paginated results.
     *
     * Administrative UI clients typically start at page 1 and increment
     * this value to fetch subsequent pages of actor search results. Values
     * less than 1 are invalid and should be rejected by validation.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of records to return in a single page.
     *
     * The implementation may enforce an upper bound (for example 100 or
     * 200) to protect the system, but callers can use this field to request
     * smaller or larger pages within that limit. Values less than 1 are
     * invalid and should be rejected.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Optional name of the field to sort results by.
     *
     * Typical sortable fields include `created_at` (actor registration
     * timestamp), `email`, `actor_type`, `status`, or an internal
     * identifier such as `id`. The exact list of supported sort keys is
     * implementation-specific, but callers should only use documented field
     * names.
     *
     * When null, a sensible default ordering such as `created_at`
     * descending is applied. Back-end validation should reject unknown sort
     * field names instead of silently ignoring them.
     */
    sort_by?: string | null | undefined;

    /**
     * Optional sort direction for the ordered results.
     *
     * Expected values are `asc` for ascending order and `desc` for
     * descending order. The value is case-sensitive and must match one of
     * these tokens when provided.
     *
     * When null, the implementation applies its default direction for the
     * selected `sort_by` field, typically `desc` for time-based fields such
     * as `created_at`. Unknown values should be rejected by validation.
     */
    sort_direction?: string | null | undefined;
  };

  /**
   * Summary view of an actor entry returned from shopping mall actor search
   * results.
   *
   * Represents a lightweight projection of actors (customers, sellers,
   * admins, or guest users) that match a search query, optimized for list
   * rendering and quick identification rather than full profile details.
   */
  export type ISummary = {
    /**
     * Unique identifier of the actor entity.
     *
     * This value uniquely identifies the actor record regardless of actor
     * role (customer, seller, admin, or guest user).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Logical actor type classification for this search result.
     *
     * Indicates which actor domain this entry belongs to, such as customer,
     * seller, admin, or guest user.
     */
    actorType: "customer" | "seller" | "admin" | "guestuser";

    /**
     * Primary display name of the actor shown in search results.
     *
     * For customers, this may be a nickname or masked name. For sellers,
     * this is typically the public store or seller name. For admins or
     * guest users, this may be a system-generated or configured label.
     */
    displayName: string;

    /**
     * Primary contact email associated with the actor when available.
     *
     * For privacy reasons this value may be partially masked, depending on
     * configuration and caller permissions.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * High-level status of the actor account in the marketplace.
     *
     * Typical values may include active, suspended, disabled, or pending
     * verification.
     */
    status: "active" | "suspended" | "disabled" | "pending";

    /**
     * Timestamp when the actor account was initially registered or first
     * created in the shopping mall platform.
     *
     * Expressed as an ISO 8601 date-time string in UTC.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}

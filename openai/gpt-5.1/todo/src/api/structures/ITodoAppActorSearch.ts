import { tags } from "typia";

import { IETodoAppActorType } from "./IETodoAppActorType";
import { IETodoAppActorSearchOrderBy } from "./IETodoAppActorSearchOrderBy";
import { IEOrderDirection } from "./IEOrderDirection";

export namespace ITodoAppActorSearch {
  /**
   * Search request payload for querying todoApp actors (guest, member, and
   * admin users).
   *
   * This schema defines the request body used by the administrative search
   * endpoint that locates different types of user actors across the todoApp
   * domain. It supports filtering by actor classification, identity hints,
   * and lifecycle timestamps and includes pagination and sorting controls.
   *
   * The intent is to provide a flexible but safe search surface for
   * administrative tooling. It does not expose any authentication secrets and
   * is purely read-only, enabling backoffice and support workflows such as
   * locating a user by email or reviewing recently created accounts.
   */
  export type IRequest = {
    /**
     * Set of actor types to include in the search.
     *
     * When provided, the search is constrained to actors whose underlying
     * Prisma records belong to the specified categories, such as guest
     * users, member users, or admin users. If omitted, the search may
     * consider all actor categories depending on implementation defaults.
     */
    actorTypes?: IETodoAppActorType[] | undefined;

    /**
     * Optional email filter used when searching member or admin users.
     *
     * This value is applied to actor types whose underlying Prisma tables
     * carry an `email` column, such as `todo_app_memberusers` and
     * `todo_app_adminusers`. It is ignored for guest users that do not have
     * an email field. Implementations may treat the value as an exact match
     * or a case-insensitive search depending on business rules.
     */
    email?: string | undefined;

    /**
     * Optional display name or nickname filter for actors.
     *
     * The field is intended to match against `display_name` columns in the
     * relevant Prisma tables, such as `todo_app_guestusers.display_name`,
     * `todo_app_memberusers.display_name`, and
     * `todo_app_adminusers.display_name`. It allows administrators to
     * search by human-friendly labels even when precise identifiers like
     * email are not known.
     */
    displayName?: string | undefined;

    /**
     * Lower bound of the actor creation timestamp range.
     *
     * When specified, only actors whose `created_at` value is greater than
     * or equal to this datetime are included in the result set. This
     * supports time-based investigations such as reviewing accounts created
     * after a specific incident date. A null value means no lower bound is
     * applied.
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound of the actor creation timestamp range.
     *
     * When specified, only actors whose `created_at` value is less than or
     * equal to this datetime are included. Combined with `createdFrom`,
     * this supports querying actors created within a given window. A null
     * value means no upper bound is applied.
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional account status filter applied to member and admin users.
     *
     * The value is compared against the `status` column on
     * `todo_app_memberusers` and `todo_app_adminusers`, which typically
     * encodes states such as active, inactive, disabled, or deleted. For
     * guest users that may not have a status column, this filter is either
     * ignored or mapped according to implementation rules.
     */
    status?: string | undefined;

    /**
     * 1-based page index for paginated search results.
     *
     * Administrators use this field to navigate through large result sets.
     * A value of 1 refers to the first page. Implementations should enforce
     * a sensible maximum page value to avoid degenerate queries over very
     * distant pages.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of actors to return in a single page.
     *
     * This field acts as the page size for pagination. Implementations must
     * enforce an upper bound (for example 100 or 200) to protect database
     * performance while still providing efficient browsing of actor records
     * for administrative use.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Primary field used to sort the result set.
     *
     * This enumeration directs the sorting strategy for the search, such as
     * ordering by creation time or by display name. It is applied
     * consistently across actor types so that a single ordering logic can
     * be used even when the underlying Prisma tables differ.
     */
    orderBy?: IETodoAppActorSearchOrderBy | undefined;

    /**
     * Sort direction applied to the chosen orderBy field.
     *
     * When set to ascending, results are returned from smallest to largest
     * according to the ordering field; when set to descending, the order is
     * reversed. This gives administrators control over whether they see
     * newest, oldest, or alphabetically first actors at the top of the
     * list.
     */
    orderDirection?: IEOrderDirection | undefined;
  };

  /**
   * Summary representation of an actor result in the todoApp actor search
   * feature.
   *
   * This type is returned when searching for actors (member users, admin
   * users, or guest users) so that the client can display a unified,
   * lightweight card for each matching identity.
   *
   * It intentionally exposes only non-sensitive, non-authentication profile
   * data and a small amount of contextual information useful for search
   * result lists, while omitting any credential or security-related fields.
   *
   * The summary result includes the actor type discriminator, a stable
   * identifier, and basic display information such as display name and email
   * when applicable, plus optional last-activity timestamps used for ordering
   * and hinting recency.
   *
   * Search consumers can inspect the actorType field to decide which
   * follow-up detail API to call for the specific actor domain (member user,
   * admin user, or guest user).
   */
  export type ISummary = {
    /**
     * High-level type of the actor returned by search.
     *
     * Typical values are "guestUser" for unauthenticated identities,
     * "memberUser" for regular authenticated users, and "adminUser" for
     * administrative operators.
     *
     * The client inspects this value to determine how to render the actor
     * and which detail endpoint to call for more information.
     */
    actorType: "guestUser" | "memberUser" | "adminUser";

    /**
     * Primary identifier of the actor within its own domain.
     *
     * For member users this matches `todo_app_memberusers.id`, for admin
     * users `todo_app_adminusers.id`, and for guest users
     * `todo_app_guestusers.id`.
     *
     * The combination of `actorType` and this `id` uniquely identifies an
     * actor across the entire todoApp service.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Human-friendly display name of the actor when available.
     *
     * For member and admin users this is the `display_name` column from
     * their respective tables. For guest users this is the optional
     * `display_name` from `todo_app_guestusers`.
     *
     * When not set in the database, the field may be an empty string or
     * omitted from the payload; clients should gracefully handle missing or
     * blank values.
     */
    display_name?: string | undefined;

    /**
     * Email-style login identifier for the actor when applicable.
     *
     * For member and admin users this corresponds to the `email` column of
     * their account table. Guest users do not have an email stored and
     * therefore this field is omitted for them.
     *
     * This value is provided only for display in administrative or
     * self-account search contexts and must not be treated as a credential
     * or token.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * Account status for the actor when applicable.
     *
     * For member and admin users this reflects the `status` column of their
     * respective tables, such as `active`, `inactive`, or `disabled`. Guest
     * users do not have an account status; this field is omitted for them.
     *
     * Search interfaces can use this value to gray out disabled accounts or
     * to filter interactive actions that are not allowed for non-active
     * actors.
     */
    status?: string | undefined;

    /**
     * Timestamp of the actor’s most recent successful login when relevant.
     *
     * For member and admin users this value comes from the `last_login_at`
     * column of their account record. For guest users, or for actors that
     * have never logged in successfully, the value is null and may be
     * omitted from the payload.
     *
     * This field helps sort or annotate search results by recent activity
     * without exposing any sensitive session details.
     */
    last_login_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}

import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { ICommunityPlatformAccountRestriction } from "../../../../../structures/ICommunityPlatformAccountRestriction";
import { IPageICommunityPlatformAccountRestriction } from "../../../../../structures/IPageICommunityPlatformAccountRestriction";

/**
 * Create a community_platform_account_restrictions record and link it to an
 * adminUser using the admin-user linkage table.
 *
 * Create a new account restriction episode that applies to a specific adminUser
 * account by inserting into community_platform_account_restrictions and linking
 * it via the admin-user linkage table.
 *
 * This operation supports moderation and security use cases in which one
 * platform administrator needs to enforce policies against another
 * administrative account. The target adminUser is identified using the
 * {username} path parameter, which maps to the unique username field on the
 * community_platform_adminusers table. That table describes administrative
 * accounts via authentication and status fields such as email, lockout
 * indicators, role flags, and lifecycle timestamps, and the implementation can
 * use these to perform additional business validations, such as preventing
 * duplicate permanent bans or enforcing stricter audit requirements for
 * super-administrative accounts.
 *
 * Once the target adminUser is resolved and validated, the operation constructs
 * a new restriction row in community_platform_account_restrictions. Each
 * restriction record is defined as a generic episode using columns that
 * distinguish the account class (for example, a value representing
 * administrative accounts), an enforcement scope such as login, posting,
 * commenting, voting, reporting, or full access, one or more reason
 * descriptors, and temporal fields that define when the restriction becomes
 * effective and when it expires or whether it is indefinite. The request body
 * typed as ICommunityPlatformAccountRestriction.ICreate should provide these
 * business attributes, subject to validation rules such as ensuring that the
 * effective period is coherent and that required scope and reason information
 * is present. Business logic may additionally enforce that certain combinations
 * of account class, scope, and temporal window do not overlap or conflict for a
 * given admin actor, even if the exact enforcement mechanism (for example,
 * database indexes or uniqueness constraints) is implementation-specific.
 *
 * After the primary restriction record is persisted, a linkage row is added to
 * the admin-user linkage table. This subsidiary table has a surrogate primary
 * key and foreign keys that reference both the restriction and the adminUser,
 * as well as lifecycle metadata to track when a linkage is active or no longer
 * applicable. By inserting a new linkage in the active state, the system
 * signals that this restriction episode currently applies to the referenced
 * adminUser. The operation then returns the newly created restriction entity as
 * ICommunityPlatformAccountRestriction so that clients can immediately reflect
 * the updated enforcement state in administrative UIs.
 *
 * Because this operation can significantly affect platform governance and the
 * availability of administrative capabilities, it is restricted to
 * platform-level administrative actors only, represented via the "adminUser"
 * authorization actor. Implementations should enforce appropriate auditing so
 * that each newly created restriction episode is captured in audit logs
 * together with information about the acting administrator and context.
 * Implementations may also trigger downstream side effects such as updating
 * status flags on community_platform_adminusers, sending security
 * notifications, or recalculating access caches. Error handling must cover
 * scenarios where the specified username does not correspond to any adminUser,
 * where the request violates temporal or business-policy constraints on
 * restrictions, and where policies disallow submitting overlapping or
 * conflicting restrictions for the same administrative actor and scope.
 *
 * @param props.connection
 * @param props.username Unique administrative handle of the target adminUser to
 *   which the new restriction episode will apply. This identifier is globally
 *   unique for administrative accounts (global scope).
 * @param props.body Business attributes and temporal window for the new account
 *   restriction episode that will be applied to the specified adminUser,
 *   including enforcement scope, high-level reason information, and effective
 *   period.
 * @path /communityPlatform/adminUser/adminUsers/:username/accountRestrictions
 * @accessor api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Unique administrative handle of the target adminUser to which the new
     * restriction episode will apply. This identifier is globally unique
     * for administrative accounts (global scope).
     */
    username: string;

    /**
     * Business attributes and temporal window for the new account
     * restriction episode that will be applied to the specified adminUser,
     * including enforcement scope, high-level reason information, and
     * effective period.
     */
    body: ICommunityPlatformAccountRestriction.ICreate;
  };
  export type Body = ICommunityPlatformAccountRestriction.ICreate;
  export type Response = ICommunityPlatformAccountRestriction;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/adminUser/adminUsers/:username/accountRestrictions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/adminUser/adminUsers/${encodeURIComponent(props.username ?? "null")}/accountRestrictions`;
  export const random = (): ICommunityPlatformAccountRestriction =>
    typia.random<ICommunityPlatformAccountRestriction>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Search and list community_platform_account_restrictions affecting a specific
 * adminUser via username.
 *
 * Retrieve a filtered and paginated list of account restriction episodes
 * associated with a specific adminUser account, leveraging the
 * community_platform_account_restrictions table together with its admin-user
 * linkage table.
 *
 * This operation targets the moderation and enforcement domain where
 * administrators need visibility into when and why a given administrative
 * account has been restricted. It uses the subsidiary linkage table that
 * connects restriction episodes to admin users, whose primary key is a
 * surrogate identifier and whose foreign fields bind restriction episodes to
 * concrete adminUser accounts. The main restriction metadata comes from
 * community_platform_account_restrictions, where each row represents a
 * restriction window with attributes such as account classification,
 * enforcement scope, reason category, optional reason detail, and temporal
 * fields that describe when the restriction becomes effective and when it
 * ceases to apply.
 *
 * When handling a request, the implementation first resolves the target
 * adminUser by the {username} path parameter using the
 * community_platform_adminusers table, where username is a unique
 * administrative handle defined by the schema. Once the admin account is
 * identified, the system queries the admin-user linkage table for records whose
 * admin user foreign key matches the resolved admin user id and whose lifecycle
 * state indicates that the linkage is active. It then joins to
 * community_platform_account_restrictions via the restriction foreign key to
 * obtain business attributes like scope, reason classification, and temporal
 * window fields.
 *
 * The request body structure, represented by
 * ICommunityPlatformAccountRestriction.IRequest, encapsulates filtering and
 * pagination options such as the enforcement scopes of interest, high-level
 * reason categories, date ranges based on the restriction’s effective period,
 * and standard page/size/sort controls. This design keeps the HTTP path simple
 * while allowing complex querying via JSON. The response, typed as
 * IPageICommunityPlatformAccountRestriction.ISummary, returns a page wrapper
 * with pagination metadata and an array of summary objects that expose key
 * fields from community_platform_account_restrictions and may include linkage
 * metadata from the admin-user linkage table, without overloading clients with
 * full detail when it is not needed.
 *
 * Security-wise, this operation is restricted to platform-level administrative
 * actors, represented by the "adminUser" authorization actor. It must not be
 * exposed to memberUser or guestUser actors because it involves sensitive
 * enforcement history about administrative accounts themselves. Implementations
 * should ensure that only data appropriate for administrative review is
 * returned and that any internal security-sensitive attributes from
 * community_platform_adminusers, such as password hashes or internal lockout
 * counters, are never exposed in the response. Error handling should cover
 * cases where the specified username does not correspond to any adminUser, in
 * which case a not-found response is appropriate, and cases where filter
 * parameters are invalid, which should result in clear validation errors rather
 * than partial or misleading results.
 *
 * @param props.connection
 * @param props.username Unique administrative handle of the target adminUser
 *   whose restriction episodes are being listed. This identifier is globally
 *   unique for administrative accounts (global scope).
 * @param props.body Search criteria, filters, and pagination parameters for
 *   listing account restriction episodes associated with the specified
 *   adminUser. The DTO exposes temporal range filters, scope and
 *   reason-category filters, and pagination and sorting controls appropriate
 *   for admin consoles.
 * @path /communityPlatform/adminUser/adminUsers/:username/accountRestrictions
 * @accessor api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Unique administrative handle of the target adminUser whose
     * restriction episodes are being listed. This identifier is globally
     * unique for administrative accounts (global scope).
     */
    username: string;

    /**
     * Search criteria, filters, and pagination parameters for listing
     * account restriction episodes associated with the specified adminUser.
     * The DTO exposes temporal range filters, scope and reason-category
     * filters, and pagination and sorting controls appropriate for admin
     * consoles.
     */
    body: ICommunityPlatformAccountRestriction.IRequest;
  };
  export type Body = ICommunityPlatformAccountRestriction.IRequest;
  export type Response = IPageICommunityPlatformAccountRestriction.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/adminUser/adminUsers/:username/accountRestrictions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/adminUser/adminUsers/${encodeURIComponent(props.username ?? "null")}/accountRestrictions`;
  export const random =
    (): IPageICommunityPlatformAccountRestriction.ISummary =>
      typia.random<IPageICommunityPlatformAccountRestriction.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Get a single `community_platform_account_restrictions` record for an admin
 * user by restriction ID.
 *
 * Retrieve detailed information about a single account restriction episode that
 * has been applied to a specific admin user account.
 *
 * This operation reads from the `community_platform_account_restrictions`
 * table, which stores primary records for restriction episodes such as
 * temporary suspensions, permanent bans, or limited-permission states. Each
 * restriction record typically includes structured fields representing the
 * restriction type, its effective time window (start and optional end
 * timestamps), the reason or justification text supplied by moderators or
 * automated systems, and metadata indicating who applied the restriction and
 * under what policy. While the exact Prisma field set is defined in the schema,
 * this endpoint is responsible for exposing a safe, well-structured
 * representation via the `ICommunityPlatformAccountRestriction` DTO.
 *
 * The admin user context is supplied via the `username` path parameter, which
 * identifies a row in `community_platform_adminusers`. The relationship between
 * admin accounts and restriction records is materialized in the subsidiary
 * table `community_platform_account_restrictions_of_adminusers`. The
 * implementation must verify that the specified `accountRestrictionId` is
 * indeed linked to the admin user indicated by `username`. If the restriction
 * does not belong to that admin, the server should respond with a not-found
 * error rather than leaking the existence of unrelated restriction records.
 *
 * From a security and authorization perspective, this endpoint should be
 * restricted to privileged actors such as `admin`-level operators in the
 * broader platform, or internal services that require access to restriction
 * histories. The `authorizationActors` are therefore modeled as
 * `["adminUser"]`, reflecting that only authenticated administrative users
 * (distinct from member users) may call this API. Additional permission
 * checks—such as super-admin vs. regular admin scopes—should be implemented in
 * the service layer as needed.
 *
 * This operation is read-only and does not alter any state. It is typically
 * used together with the update operation on the same resource (`PUT
 * /adminUsers/{username}/accountRestrictions/{accountRestrictionId}`) when
 * reviewing and potentially adjusting restriction parameters. Error handling
 * should distinguish between: (1) unknown `username`, (2) unknown
 * `accountRestrictionId`, and (3) mismatched association between the admin user
 * and the restriction record. In all such cases, a 404-style response is
 * appropriate to avoid disclosing cross-account relationships.
 *
 * @param props.connection
 * @param props.username Unique username of the target administrative user
 *   account whose restriction is being inspected. This value corresponds to the
 *   human-readable identifier in the `community_platform_adminusers` table and
 *   is treated as globally unique across all admin users (global scope).
 * @param props.accountRestrictionId Unique identifier of the target account
 *   restriction episode applied to the specified admin user. This corresponds
 *   to the primary key of a record in the
 *   `community_platform_account_restrictions` table and is typically
 *   represented as a UUID string.
 * @path /communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId
 * @accessor api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique username of the target administrative user account whose
     * restriction is being inspected. This value corresponds to the
     * human-readable identifier in the `community_platform_adminusers`
     * table and is treated as globally unique across all admin users
     * (global scope).
     */
    username: string;

    /**
     * Unique identifier of the target account restriction episode applied
     * to the specified admin user. This corresponds to the primary key of a
     * record in the `community_platform_account_restrictions` table and is
     * typically represented as a UUID string.
     */
    accountRestrictionId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformAccountRestriction;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/adminUser/adminUsers/${encodeURIComponent(props.username ?? "null")}/accountRestrictions/${encodeURIComponent(props.accountRestrictionId ?? "null")}`;
  export const random = (): ICommunityPlatformAccountRestriction =>
    typia.random<ICommunityPlatformAccountRestriction>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.param("accountRestrictionId")(() =>
        typia.assert(props.accountRestrictionId),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update a `community_platform_account_restrictions` record for an admin user
 * by restriction ID.
 *
 * Update the details of an existing account restriction episode associated with
 * a specific admin user account.
 *
 * This operation targets the `community_platform_account_restrictions` table,
 * which stores primary records for account-level restriction episodes across
 * the community platform. Typical fields include the restriction category (for
 * example, temporary suspension, read-only mode, or full ban), the effective
 * period defined by start and end timestamps, human-readable reason text, and
 * system or moderator notes used for internal decision tracking. Through the
 * `ICommunityPlatformAccountRestriction.IUpdate` DTO, clients may modify only
 * those fields that the business rules allow to change after initial creation.
 *
 * The admin user context is determined from the `username` path parameter,
 * matching a row in the `community_platform_adminusers` table. The restriction
 * context is determined from `accountRestrictionId`, which is the primary key
 * of the restriction record in `community_platform_account_restrictions`. The
 * implementation must verify via the subsidiary table
 * `community_platform_account_restrictions_of_adminusers` that this restriction
 * is indeed associated with the specified admin user. If the restriction
 * belongs to a different account or no association exists, the service must
 * reject the update with a not-found style error, thereby preventing
 * cross-account tampering and inadvertent information disclosure.
 *
 * From a security perspective, only privileged administrative actors should be
 * able to modify restriction records on admin accounts. The endpoint therefore
 * uses `authorizationActors: ["adminUser"]`, indicating that only authenticated
 * administrative users—subject to further in-service permission checks—may call
 * this API. Additional safeguards like audit logging of every change, mandatory
 * justification text when lifting or altering a restriction, and concurrency
 * controls (e.g., checking an `updatedAt` version field) should be implemented
 * in the service layer to satisfy the broader non-functional and compliance
 * requirements.
 *
 * This update operation works in tandem with the corresponding retrieval
 * endpoint (`GET
 * /adminUsers/{username}/accountRestrictions/{accountRestrictionId}`), which
 * allows clients to view the current state before applying changes. Error
 * handling should differentiate between invalid identifiers, missing
 * associations, validation failures on the update DTO (such as invalid date
 * ranges or unsupported restriction types), and authorization failures. All
 * validation rules must be aligned with the domain constraints defined for the
 * `community_platform_account_restrictions` model in the Prisma schema and the
 * business rules documents.
 *
 * @param props.connection
 * @param props.username Unique username of the target administrative user
 *   account whose restriction record is being updated. This corresponds to the
 *   globally unique username field in the `community_platform_adminusers` table
 *   (global scope).
 * @param props.accountRestrictionId Unique identifier of the account
 *   restriction episode to modify. This value is the primary key of a record in
 *   the `community_platform_account_restrictions` table, typically represented
 *   as a UUID string.
 * @param props.body Fields to update on the target account restriction record,
 *   constrained to the mutable properties allowed by business rules for
 *   `community_platform_account_restrictions`. Path parameters define which
 *   admin user and restriction record are being modified.
 * @path /communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId
 * @accessor api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique username of the target administrative user account whose
     * restriction record is being updated. This corresponds to the globally
     * unique username field in the `community_platform_adminusers` table
     * (global scope).
     */
    username: string;

    /**
     * Unique identifier of the account restriction episode to modify. This
     * value is the primary key of a record in the
     * `community_platform_account_restrictions` table, typically
     * represented as a UUID string.
     */
    accountRestrictionId: string & tags.Format<"uuid">;

    /**
     * Fields to update on the target account restriction record,
     * constrained to the mutable properties allowed by business rules for
     * `community_platform_account_restrictions`. Path parameters define
     * which admin user and restriction record are being modified.
     */
    body: ICommunityPlatformAccountRestriction.IUpdate;
  };
  export type Body = ICommunityPlatformAccountRestriction.IUpdate;
  export type Response = ICommunityPlatformAccountRestriction;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/adminUser/adminUsers/${encodeURIComponent(props.username ?? "null")}/accountRestrictions/${encodeURIComponent(props.accountRestrictionId ?? "null")}`;
  export const random = (): ICommunityPlatformAccountRestriction =>
    typia.random<ICommunityPlatformAccountRestriction>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.param("accountRestrictionId")(() =>
        typia.assert(props.accountRestrictionId),
      );
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Deactivate a `community_platform_account_restrictions` record for a specific
 * adminUser identified by username and restriction ID.
 *
 * Remove the effect of a previously created restriction episode on an
 * administrative account by deactivating a record in the
 * `community_platform_account_restrictions` table.
 *
 * This operation targets a specific restriction identified by
 * `accountRestrictionId` that applies to an admin actor. The `username` path
 * parameter identifies the owning admin account through the
 * `community_platform_adminusers` table, while the restriction row itself lives
 * in `community_platform_account_restrictions`. The handler must ensure that
 * the restriction corresponds to an admin account, that it is associated with
 * the admin identified by `username` via the appropriate foreign key, and that
 * it has not already been deactivated according to the deletion indicator used
 * in the schema (for example, a dedicated status field or a nullable timestamp
 * column).
 *
 * From a security perspective, only privileged administrative actors should be
 * allowed to call this endpoint. The service is expected to check that the
 * authenticated caller is authorized to manage restrictions for the target
 * admin, especially when the restriction was created by a different
 * administrator. Implementation should record suitable audit log entries so
 * there is a clear trail of who deactivated which restriction and when,
 * allowing subsequent review of moderation decisions.
 *
 * Instead of exposing the exact persistence mechanism to clients, this
 * operation is documented in terms of its observable behavior: after a
 * successful call, the targeted restriction no longer participates in any
 * enforcement or authorization checks. Relying subsystems that enforce
 * restrictions must consistently filter out or ignore deactivated records based
 * on the configured deletion indicator so that they do not affect runtime
 * behavior. Fields such as `starts_at`, `ends_at`, and `reason_category` remain
 * available for historical analysis and reporting when the system retains
 * deactivated rows.
 *
 * Related operations typically include endpoints that list current restrictions
 * for an admin user and endpoints that create new restrictions, for example, as
 * part of moderation case resolution. Clients should normally fetch
 * restrictions using a list operation before deciding which one to deactivate
 * here, and they should handle error responses when the identifier does not
 * correspond to an active restriction for the given `username`.
 *
 * @param props.connection
 * @param props.username Unique administrator username (global scope)
 *   identifying the target adminUser in `community_platform_adminusers` whose
 *   restriction is being deactivated.
 * @param props.accountRestrictionId Unique identifier (UUID) of the restriction
 *   episode in `community_platform_account_restrictions.id` that should be
 *   deactivated for the specified adminUser.
 * @path /communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId
 * @accessor api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique administrator username (global scope) identifying the target
     * adminUser in `community_platform_adminusers` whose restriction is
     * being deactivated.
     */
    username: string;

    /**
     * Unique identifier (UUID) of the restriction episode in
     * `community_platform_account_restrictions.id` that should be
     * deactivated for the specified adminUser.
     */
    accountRestrictionId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/adminUser/adminUsers/:username/accountRestrictions/:accountRestrictionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/adminUser/adminUsers/${encodeURIComponent(props.username ?? "null")}/accountRestrictions/${encodeURIComponent(props.accountRestrictionId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.param("accountRestrictionId")(() =>
        typia.assert(props.accountRestrictionId),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

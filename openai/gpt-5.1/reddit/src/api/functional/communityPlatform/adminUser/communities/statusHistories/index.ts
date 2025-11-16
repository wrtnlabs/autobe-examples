import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { ICommunityPlatformCommunityStatusHistory } from "../../../../../structures/ICommunityPlatformCommunityStatusHistory";
import { IPageICommunityPlatformCommunityStatusHistory } from "../../../../../structures/IPageICommunityPlatformCommunityStatusHistory";

/**
 * Search status history records for a community from
 * `community_platform_community_status_histories`.
 *
 * Retrieve a filtered, paginated list of status and visibility change history
 * records for a specific community, identified by its `slug` in the
 * `community_platform_communities` table.
 *
 * This search operation targets the
 * `community_platform_community_status_histories` Prisma model, which is
 * described as an append-only, audit-focused snapshot table capturing
 * historical transitions in community visibility and lifecycle status. Each
 * record references a community via `community_id`
 * (`community_platform_communities`), and may reference either a
 * `community_platform_memberusers` actor (via `actor_memberuser_id`) or a
 * `community_platform_adminusers` actor (via `actor_adminuser_id`). Fields such
 * as `previous_visibility`, `new_visibility`, `previous_status`, `new_status`,
 * `reason_category`, `reason_detail`, and `created_at` provide detailed context
 * around how and why the community's state evolved over time.
 *
 * From a security and authorization standpoint, the history of community status
 * changes is inherently sensitive, because it may expose moderation rationale,
 * internal policy categories, or actor identities. Therefore, this endpoint is
 * restricted to administrative actors, represented conceptually as `adminUser`
 * in the `authorizationActors` field. Implementations should enforce that only
 * platform administrators (or comparable high-privilege roles) can access this
 * endpoint. Community owners or regular members generally should not see full
 * moderation audit history unless business rules explicitly permit it, in which
 * case enforcement would still happen in service-layer logic.
 *
 * The request body type `ICommunityPlatformCommunityStatusHistory.IRequest` is
 * expected to carry search, filter, and pagination parameters only; it must not
 * allow mutation of history data, as
 * `community_platform_community_status_histories` is a snapshot/audit table and
 * thus append-only from a business perspective. Typical filters include:
 *
 * - Time windows based on `created_at` (e.g., last 30 days of changes)
 * - Specific `new_status` or `previous_status` values (such as "archived",
 *   "locked", "banned")
 * - `reason_category` codes (e.g., "moderation", "owner_request",
 *   "system_policy")
 * - Actor scoping (admin-driven vs member-driven changes), implemented via
 *   inferred filters on `actor_adminuser_id` and `actor_memberuser_id`.
 *
 * The response type `IPageICommunityPlatformCommunityStatusHistory.ISummary`
 * should be a paginated container including standard pagination metadata and an
 * array of summary objects. Each summary should surface key properties from the
 * underlying table: the target community identifier, the old and new
 * visibility/status values, the high-level reason category, whether the change
 * was driven by an admin or member actor, and the effective `created_at`
 * timestamp. Implementations should exclude or minimize exposure of any
 * superfluous internal fields and must ensure that logically removed history
 * records (with `deleted_at` not null) are either filtered out or clearly
 * marked according to business policy.
 *
 * Error handling should cover cases such as an unknown `communitySlug` (no
 * matching `community_platform_communities.slug`), invalid filter combinations,
 * or insufficient permissions. If the slug does not exist or maps to a
 * community whose `deleted_at` indicates permanent closure and business rules
 * prohibit viewing its history, the operation should respond with an
 * appropriate error (such as 404 or 403) rather than leaking information about
 * hidden communities.
 *
 * This endpoint works in concert with the `GET
 * /communities/{communitySlug}/statusHistories/{statusHistoryId}` operation,
 * which retrieves a single detailed history record. In typical UI flows, this
 * list endpoint is called first to render a timeline or table of status
 * changes, and users can then drill into a particular history entry via the
 * detail endpoint for richer context.
 *
 * @param props.connection
 * @param props.communitySlug Globally unique, URL-safe slug identifier of the
 *   target community, corresponding to the `slug` column of
 *   `community_platform_communities` (global scope).
 * @param props.body Search filters, sorting options, and pagination parameters
 *   for retrieving community status history records associated with the
 *   specified community slug.
 * @path /communityPlatform/adminUser/communities/:communitySlug/statusHistories
 * @accessor api.functional.communityPlatform.adminUser.communities.statusHistories.index
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
     * Globally unique, URL-safe slug identifier of the target community,
     * corresponding to the `slug` column of
     * `community_platform_communities` (global scope).
     */
    communitySlug: string;

    /**
     * Search filters, sorting options, and pagination parameters for
     * retrieving community status history records associated with the
     * specified community slug.
     */
    body: ICommunityPlatformCommunityStatusHistory.IRequest;
  };
  export type Body = ICommunityPlatformCommunityStatusHistory.IRequest;
  export type Response = IPageICommunityPlatformCommunityStatusHistory.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/adminUser/communities/:communitySlug/statusHistories",
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
    `/communityPlatform/adminUser/communities/${encodeURIComponent(props.communitySlug ?? "null")}/statusHistories`;
  export const random =
    (): IPageICommunityPlatformCommunityStatusHistory.ISummary =>
      typia.random<IPageICommunityPlatformCommunityStatusHistory.ISummary>();
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
      assert.param("communitySlug")(() => typia.assert(props.communitySlug));
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
 * Get a single community status history record from
 * `community_platform_community_status_histories`.
 *
 * Retrieve a single detailed status and visibility change history record for a
 * specific community, scoping by both community slug and history record
 * identifier.
 *
 * This operation reads from the `community_platform_community_status_histories`
 * Prisma model. Each record in this table represents one change event in the
 * lifecycle of a community, linking to the `community_platform_communities`
 * table via `community_id` and optionally to `community_platform_memberusers`
 * or `community_platform_adminusers` via `actor_memberuser_id` and
 * `actor_adminuser_id`. The primary key `id` is a UUID that uniquely identifies
 * each change event; this value is exposed as the `statusHistoryId` path
 * parameter, while `communitySlug` uses the human-friendly, globally unique
 * `slug` from `community_platform_communities`.
 *
 * From an authorization standpoint, viewing detailed status history—including
 * prior and new visibility modes, lifecycle statuses, and the actor
 * responsible—is considered sensitive administrative information. Consequently,
 * this endpoint is restricted to administrative actors represented by the
 * `adminUser` authorization actor. Implementations should enforce that only
 * properly authenticated and authorized admin users can access this endpoint,
 * and must ensure that the combination of `communitySlug` and `statusHistoryId`
 * actually corresponds to a valid relationship: the history record's
 * `community_id` must belong to the community identified by the slug.
 *
 * The response type `ICommunityPlatformCommunityStatusHistory` should surface
 * all relevant fields from the snapshot model: `previous_visibility`,
 * `new_visibility`, `previous_status`, `new_status`, `reason_category`,
 * `reason_detail`, `created_at`, and any actor references. Because
 * `community_platform_community_status_histories` is designed as an audit and
 * investigation table, this endpoint must never allow modifications to records
 * and should treat the table as append-only. If `deleted_at` is used to
 * logically remove certain history records from general visibility, business
 * rules must dictate whether such records can still be retrieved for deep audit
 * (e.g., visible only to super-admins) or should be treated as not found.
 *
 * This endpoint is expected to be used after the corresponding list endpoint
 * `PATCH /communities/{communitySlug}/statusHistories` has been called to
 * display a list or timeline. Users select a specific history entry from that
 * list, and the client then calls this detail endpoint to show full context,
 * including extended textual explanations in `reason_detail` and identification
 * of the responsible actor. Typical error scenarios include an invalid or
 * non-existent `communitySlug`, a malformed or unknown `statusHistoryId`, a
 * mismatch where the history record does not belong to the specified community,
 * or insufficient permissions, all of which should return appropriate error
 * responses without leaking sensitive references.
 *
 * @param props.connection
 * @param props.communitySlug Globally unique, URL-safe slug identifier of the
 *   target community, corresponding to the `slug` column of
 *   `community_platform_communities` (global scope).
 * @param props.statusHistoryId Unique identifier (UUID) of the target community
 *   status history record, corresponding to the `id` column of
 *   `community_platform_community_status_histories`.
 * @path /communityPlatform/adminUser/communities/:communitySlug/statusHistories/:statusHistoryId
 * @accessor api.functional.communityPlatform.adminUser.communities.statusHistories.at
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
     * Globally unique, URL-safe slug identifier of the target community,
     * corresponding to the `slug` column of
     * `community_platform_communities` (global scope).
     */
    communitySlug: string;

    /**
     * Unique identifier (UUID) of the target community status history
     * record, corresponding to the `id` column of
     * `community_platform_community_status_histories`.
     */
    statusHistoryId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityStatusHistory;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/adminUser/communities/:communitySlug/statusHistories/:statusHistoryId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/adminUser/communities/${encodeURIComponent(props.communitySlug ?? "null")}/statusHistories/${encodeURIComponent(props.statusHistoryId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityStatusHistory =>
    typia.random<ICommunityPlatformCommunityStatusHistory>();
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
      assert.param("communitySlug")(() => typia.assert(props.communitySlug));
      assert.param("statusHistoryId")(() =>
        typia.assert(props.statusHistoryId),
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

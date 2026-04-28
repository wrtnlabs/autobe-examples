import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityBan } from "../../../../../structures/ICommunityPlatformCommunityBan";
import { IPageICommunityPlatformCommunityBan } from "../../../../../structures/IPageICommunityPlatformCommunityBan";

export * as snapshots from "./snapshots/index";

/**
 * Create a new participation ban for a member within the specified community.
 *
 * This operation creates a community-scoped ban record in the shared space represented by the community resource. It uses the target community identified by `communityId` and creates a new `community_platform_community_bans` record describing the affected member, the moderation reason, the current ban lifecycle state, and the time the restriction becomes effective. In the underlying schema, a community ban belongs to exactly one `community_platform_communities` record and one `community_platform_members` record, which reflects the business rule that a ban applies to one member in one community only.
 *
 * The operation is intended for authenticated members who currently hold moderation authority in the selected community. That authority is determined through an active `community_platform_community_moderators` assignment in the same community, covering both owner-linked and moderator standing. If the caller does not hold moderation authority for the selected community, the request must be rejected. Guests cannot use this endpoint, and a member's authority in one community does not authorize ban creation in another community.
 *
 * The created ban restricts participation within the selected community while preserving visibility of the community and its content. This behavior is consistent with the business requirements stating that banned members may still view the community, its posts, and its comments, but cannot participate through actions such as commenting. The ban must therefore be interpreted as a community-local participation restriction rather than a removal of browsing access or a platform-wide account restriction.
 *
 * Implementation must honor the isolation rules between communities. A ban created through this endpoint affects only the specified community and must not alter the target member's ability to participate elsewhere unless separate bans exist in those communities. If the target member is already actively banned in the same community, the request must be rejected rather than creating a duplicate active restriction. If the selected community does not exist or the target member does not exist, the operation must also reject the request.
 *
 * This operation should also create a corresponding moderation audit trail. The service should record a `community_platform_moderation_actions` entry using an action type such as `ban_create`, scoped to the same community and linked to the acting moderation assignment, then create the related `community_platform_moderation_action_bans` subtype row pointing to the newly created ban. That audit linkage ensures later review of who imposed the restriction, in which community, and for which ban record.
 *
 * This endpoint is commonly used together with community moderation and participation APIs. For example, after a ban is created here, downstream comment or posting APIs for the same community must enforce the new ban state and reject further participation attempts by the banned member in that community. Clients that need to inspect the resulting ban details or audit history should use related community moderation retrieval operations after this creation request succeeds.
 *
 * @param props.connection
 * @param props.communityId Target community identifier
 * @param props.body Information required to create a community ban
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Validate that the caller is an authenticated member.
 *   Resolve the path parameter `communityId` against
 *   `community_platform_communities.id` and fail if no such community exists.
 *
 * Load the caller's active moderation assignment from `community_platform_community_moderators` where `community_platform_community_id = communityId`, `community_platform_member_id = callerMemberId`, `status` indicates active standing, and `deleted_at IS NULL`. If no active assignment exists, reject the request as unauthorized for community-local ban management.
 *
 * Validate the request body. Resolve the target member from `community_platform_members` using the provided member identifier and reject if the member does not exist. Ensure the target member can be interpreted only within the selected community scope. Check `community_platform_community_bans` for an existing active ban on the same pair of `community_platform_community_id` and `community_platform_member_id`, excluding logically removed records as appropriate. If an active ban already exists, reject the request.
 *
 * Create the ban in a transaction. Insert a new `community_platform_community_bans` row with a generated UUID, `community_platform_community_id` from the path, `community_platform_member_id` from the request, the moderation `reason`, an initial active `status`, `started_at` set to the effective time, optional `expired_at` when a time-limited ban is requested, `lifted_at = null`, and current timestamps for `created_at` and `updated_at`. Do not modify browsing permissions for the target member.
 *
 * Within the same transaction, insert a `community_platform_moderation_actions` row linked to the acting `community_platform_community_moderators.id`, the same community, `action_type = ban_create`, optional moderator note if the create DTO supports it, and current timestamps. Then insert the one-to-one subtype row in `community_platform_moderation_action_bans` linking the moderation action to the newly created community ban.
 *
 * Return the created community ban resource. The response should represent the persisted ban state including identifiers, timestamps, status, and any expiration fields. Error cases include missing community, missing target member, lack of community-local moderation authority, and duplicate active ban in the same community. The service should keep all writes atomic so that the ban and its audit record are either both persisted or both rolled back.
 * @path /communityPlatform/admin/communities/:communityId/bans
 * @accessor api.functional.communityPlatform.admin.communities.bans.create
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
     * Target community identifier
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Information required to create a community ban
     */
    body: ICommunityPlatformCommunityBan.ICreate;
  };
  export type Body = ICommunityPlatformCommunityBan.ICreate;
  export type Response = ICommunityPlatformCommunityBan;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/admin/communities/:communityId/bans",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans`;
  export const random = (): ICommunityPlatformCommunityBan =>
    typia.random<ICommunityPlatformCommunityBan>();
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
      assert.param("communityId")(() => typia.assert(props.communityId));
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
 * Retrieve a filtered and paginated list of currently active community ban records for a specific community.
 *
 * This operation provides the moderator-facing banned-user list for one community identified by `communityId`. In the business model, a community is the shared space that organizes membership, content, moderation, and reporting relationships, and it acts as the boundary for bans. Consistent with that model, this endpoint never aggregates bans across multiple communities. It returns only ban records that belong to the specified `community_platform_communities` record and are still active in that community, supporting moderation workflows that need to identify which members are currently restricted from participation.
 *
 * The returned data is grounded in the `community_platform_community_bans` table, which stores community-scoped participation ban records for members within a specific community. Each ban record captures the affected community, the banned member, the moderation reason, the current ban lifecycle status, and timing fields such as when the ban became effective and whether it has expired or been lifted. The banned member identity comes from `community_platform_members`, the canonical authenticated member account table, allowing moderation tooling to associate each active ban with the underlying member account that is restricted from posting and commenting.
 *
 * Access to this operation must be restricted to a member who currently holds moderation authority in the specified community, including the owner role within that community governance structure. The loaded requirements describe the banned-users list as a moderator workflow and require community-specific authority boundaries for ban-related actions. Guests must not access this endpoint, and ordinary members without moderation authority in the selected community must be denied. If the target community does not exist, the request must be rejected rather than interpreted against any other scope.
 *
 * This endpoint is intended for management and review, not for changing ban state. It should typically be used together with the community-specific ban creation and removal operations. After a moderator applies a ban, this list can be queried to confirm that the affected user now appears as actively banned. If a ban has been lifted or has otherwise ceased to be active, the requirements state that the user must no longer appear in this list. When no active bans exist for the community, the endpoint must return an empty paginated result rather than an error.
 *
 * Search behavior may support pagination, sorting, and safe filtering over fields that are actually present on the ban record, such as reason text, status, started time, expiration time, and updated time. However, regardless of optional client filters, the implementation must preserve the core business rule that the banned-user list represents active bans for the selected community only. Error handling must therefore reject invalid community identifiers, deny callers without local moderation authority, and avoid exposing ban data outside the requested community boundary.
 *
 * @param props.connection
 * @param props.communityId Target community's unique identifier
 * @param props.body Pagination, filtering, and sorting options for the community ban list
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Validate that `communityId` is a valid UUID-shaped
 *   identifier and load the target row from `community_platform_communities` by
 *   `id`. If no community exists for that identifier, reject the request.
 *
 * Authorize the caller as an authenticated member with moderation authority in the selected community. Implementation must verify that the acting member is either the community owner or otherwise holds an active community-specific moderation role for that same community. Deny access for guests and for members who do not hold moderation authority in the selected community.
 *
 * Build a paginated list query rooted in `community_platform_community_bans` and constrained by `community_platform_community_id = {communityId}`. Enforce the business meaning of this endpoint by returning only active bans for that community. The active-state predicate should exclude records that are logically removed, manually lifted, or no longer active according to ban lifecycle fields. At minimum, exclude rows with `deleted_at IS NOT NULL`, exclude rows where `lifted_at IS NOT NULL`, and constrain lifecycle `status` to the implementation's active value set. If the service also interprets `expired_at`, exclude bans whose expiration timestamp has already passed.
 *
 * Support request-body-driven pagination, sorting, and filtering using the `ICommunityPlatformCommunityBan.IRequest` DTO. Safe filters may include reason text search and date-range or status-oriented filters, but they must never widen the result beyond the selected community or include non-active bans. Apply deterministic ordering, using a stable default such as `started_at DESC, id DESC` when the client does not provide a supported sort.
 *
 * Join or batch-load related `community_platform_members` rows for the banned members referenced by the selected ban records so the response summary can include member-identifying information defined by the generated summary DTO. Use only actual schema fields such as member `id`, `code`, `email_verified`, status, and timestamps where those fields are represented in downstream DTO definitions. Do not assume undeclared profile or moderation fields in this operation implementation.
 *
 * Return a paginated `IPageICommunityPlatformCommunityBan.ISummary` result. If the community exists and there are no active bans, return an empty page object with valid pagination metadata. Keep the operation read-only and non-transactional except for ordinary consistency guarantees of the underlying read path.
 * @path /communityPlatform/admin/communities/:communityId/bans
 * @accessor api.functional.communityPlatform.admin.communities.bans.index
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
     * Target community's unique identifier
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Pagination, filtering, and sorting options for the community ban list
     */
    body: ICommunityPlatformCommunityBan.IRequest;
  };
  export type Body = ICommunityPlatformCommunityBan.IRequest;
  export type Response = IPageICommunityPlatformCommunityBan.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/admin/communities/:communityId/bans",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans`;
  export const random = (): IPageICommunityPlatformCommunityBan.ISummary =>
    typia.random<IPageICommunityPlatformCommunityBan.ISummary>();
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
      assert.param("communityId")(() => typia.assert(props.communityId));
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
 * Retrieve the detailed current-state information for a single community participation ban within a specific community.
 *
 * This operation is used by a community moderator or owner to inspect one ban record in its proper moderation context. The underlying community_platform_community_bans table stores the current business state of a community-scoped participation restriction, including the affected community reference, the banned member reference, the moderation reason, the current lifecycle status, and the timestamps that indicate when the ban started, when it may expire, and whether it has already been lifted. The endpoint is intentionally nested beneath the community path so the client and server both treat the ban as belonging to one identified community rather than as a platform-wide restriction.
 *
 * Security for this operation must follow the moderation boundary described in the requirements. Ban management and visibility are community-local moderation capabilities, not public browsing features. The caller must therefore hold moderation authority in the target community. The operation must not disclose ban data from other communities, because moderation data for one community must remain separate from moderation data for other communities. Even if a ban identifier exists, the server must reject access when the record does not belong to the community identified by the path.
 *
 * This operation reflects the business rule that a community ban restricts participation only within the selected community while preserving community and content visibility. The returned resource should therefore expose the ban's state as a moderation record rather than implying total account suspension. It should communicate the current enforcement status and timing information from the community_platform_community_bans record so moderators can understand whether the restriction is active, scheduled to expire, or already lifted.
 *
 * This endpoint is typically used together with the community banned-users browsing operation. A moderator may first retrieve the current banned-user list for a community to discover active restrictions, then call this detail operation for one specific ban record to inspect its reason, lifecycle timestamps, and exact state. If the community does not exist, if the ban does not exist, or if the ban exists outside the specified community scope, the request must fail rather than returning mismatched moderation data.
 *
 * @param props.connection
 * @param props.communityId Target community's UUID identifier that scopes the ban lookup.
 * @param props.banId Target community ban's UUID identifier within the specified community scope.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement this operation as a scoped read against the
 *   community_platform_community_bans table.
 *
 * 1. Authenticate the caller as a member and verify that the caller currently holds moderation authority in the community identified by communityId. This authorization check must be community-local, because the requirements state that ban actions and visibility are limited to the selected community.
 * 2. Validate that a community_platform_communities record exists for communityId and is not outside the intended readable lifecycle boundary for moderation tooling.
 * 3. Query community_platform_community_bans by id = banId and community_platform_community_id = communityId in the same lookup. Do not fetch by banId alone and trust the result afterward; the community scope must be part of the retrieval condition.
 * 4. Exclude logically removed ban records from normal success responses by enforcing deleted_at IS NULL unless the broader service explicitly supports historical retrieval elsewhere. This endpoint should represent the current ban resource, not retired records.
 * 5. If no scoped ban record is found, return a not-found error. Use the same outcome when the ban belongs to a different community so cross-community record existence is not disclosed.
 * 6. Build the response from the community_platform_community_bans fields: id, community_platform_community_id, community_platform_member_id, reason, status, started_at, expired_at, lifted_at, created_at, and updated_at. Include related community and member projections only if the canonical ICommunityPlatformCommunityBan schema requires them and they can be loaded safely without violating separation rules.
 * 7. Ensure the returned status reflects the persisted lifecycle state from the ban record rather than recalculating and overwriting stored business meaning. Time-based interpretation may be added by downstream consumers, but the persisted fields remain authoritative.
 *
 * Error handling:
 * - Return forbidden when the caller lacks moderation authority in the specified community.
 * - Return not found when the community does not exist in the intended scope.
 * - Return not found when the ban does not exist or does not belong to the specified community.
 * - Do not expose information about bans from other communities.
 *
 * Implementation notes:
 * - Use a single read transaction or equivalent consistent read path for authorization-sensitive lookup if the service architecture requires it.
 * - Keep the operation side-effect free; it must not modify ban status, lifted_at, or audit data.
 * - If moderation audit tracing is implemented elsewhere, this read should not create a new moderation action record because community_platform_moderation_actions stores enforcement steps, not ordinary detail views.
 * @path /communityPlatform/admin/communities/:communityId/bans/:banId
 * @accessor api.functional.communityPlatform.admin.communities.bans.at
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
     * Target community's UUID identifier that scopes the ban lookup.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target community ban's UUID identifier within the specified community scope.
     */
    banId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityBan;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/communities/:communityId/bans/:banId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans/${encodeURIComponent(props.banId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityBan =>
    typia.random<ICommunityPlatformCommunityBan>();
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
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("banId")(() => typia.assert(props.banId));
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
 * Update an existing community-specific participation ban for a member within the selected community.
 *
 * This operation manages a record from `community_platform_community_bans`, which stores the current enforcement state of one ban applied to one member in one `community_platform_communities` space. The ban record contains the moderation reason, lifecycle status, effective start timestamp, optional automatic expiration timestamp, and optional manual lift timestamp. Updating this resource allows an authorized moderator to maintain the current business state of a ban that already exists for the community, such as correcting the reason, changing lifecycle status, adjusting the planned expiration, or recording that the ban has been lifted.
 *
 * Access to this operation is restricted to a member who currently holds moderation authority in the target community. That authority must be verified against `community_platform_community_moderators` in the same community context, including active owner-linked standing represented through `community_platform_community_moderator_owners`. A member without active moderation authority for the specified community must not be allowed to update the ban. The operation is community-scoped only and must never change participation rights in any other community.
 *
 * The `communitySlug` parameter identifies the parent community using the platform-wide unique community identifier stored in `community_platform_communities.slug`, which is intended for readable URLs and lookup operations. The `banId` parameter identifies the concrete ban record by UUID because `community_platform_community_bans` does not define a readable unique code. The service must verify that the specified ban belongs to the community resolved by `communitySlug`; a ban record from another community is not a valid target for this endpoint.
 *
 * This operation is closely related to community moderation workflows such as creating a ban and viewing the banned-user list. After a successful update, subsequent banned-user list retrieval for the same community should reflect the revised active-state information according to the current `status`, `expired_at`, `lifted_at`, and deletion state of the underlying record. If the community does not exist, the ban does not exist, the ban is outside the specified community, or the caller lacks authority in that community, the request must be rejected.
 *
 * @param props.connection
 * @param props.communitySlug Target community's unique slug used for community-scoped moderation lookup (global scope).
 * @param props.banId Target community ban record ID within the specified community.
 * @param props.body Updated lifecycle and moderation details for the community ban
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Resolve the target community by `communitySlug` using
 *   `community_platform_communities.slug`, and reject the request if no
 *   matching community exists or if the community is not in an updatable
 *   business state.
 *
 * Authorize the caller as an authenticated member with active moderation authority in that same community. Check `community_platform_community_moderators` for a record matching the resolved community and the caller's member ID, requiring an active assignment that has not been revoked or logically removed. Treat owner-linked standing through `community_platform_community_moderator_owners` as valid moderation authority as well. Reject callers who are guests, non-members, or members without current moderation standing in the specified community.
 *
 * Load the target ban from `community_platform_community_bans` by `banId` and verify that its `community_platform_community_id` matches the resolved community ID. Reject the request when the ban does not exist, is logically removed, or belongs to a different community.
 *
 * Apply the update fields from `ICommunityPlatformCommunityBan.IUpdate` only to columns that are actually mutable for ban management. Persist changes to fields such as `reason`, `status`, `expired_at`, and `lifted_at` according to the DTO definition, and always refresh `updated_at`. Preserve immutable identifiers and relationship fields such as `id`, `community_platform_community_id`, `community_platform_member_id`, `started_at`, and `created_at` unless the downstream DTO explicitly defines a permitted lifecycle adjustment and it is supported by business rules.
 *
 * Validate business consistency before saving. Do not allow an update that would move the ban outside the single identified community. If the requested state means the ban is lifted, ensure the resulting lifecycle values are coherent, for example by setting `lifted_at` when the business rule requires manual-lift tracking. If the resulting state means the ban remains active, ensure that lift-related values do not contradict active enforcement. Treat expiration and lifting as community-specific lifecycle changes only.
 *
 * Perform the update in a single transaction, return the refreshed `community_platform_community_bans` record mapped to `ICommunityPlatformCommunityBan`, and ensure downstream list operations for banned users only consider bans whose resulting state is currently active in the community. Return appropriate not-found or forbidden errors for invalid community scope, missing resources, or missing authorization.
 * @path /communityPlatform/admin/communities/:communitySlug/bans/:banId
 * @accessor api.functional.communityPlatform.admin.communities.bans.update
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
     * Target community's unique slug used for community-scoped moderation lookup (global scope).
     */
    communitySlug: string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"uri"> &
      tags.ContentMediaType<"text/plain">;

    /**
     * Target community ban record ID within the specified community.
     */
    banId: string & tags.Format<"uuid">;

    /**
     * Updated lifecycle and moderation details for the community ban
     */
    body: ICommunityPlatformCommunityBan.IUpdate;
  };
  export type Body = ICommunityPlatformCommunityBan.IUpdate;
  export type Response = ICommunityPlatformCommunityBan;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/admin/communities/:communitySlug/bans/:banId",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communitySlug ?? "null")}/bans/${encodeURIComponent(props.banId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityBan =>
    typia.random<ICommunityPlatformCommunityBan>();
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
      assert.param("communitySlug")(() => typia.assert(props.communitySlug));
      assert.param("banId")(() => typia.assert(props.banId));
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

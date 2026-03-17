import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityBanSnapshot } from "../../../../../../structures/ICommunityPlatformCommunityBanSnapshot";
import { IPageICommunityPlatformCommunityBanSnapshot } from "../../../../../../structures/IPageICommunityPlatformCommunityBanSnapshot";

/**
 * Create a new moderation history snapshot entry for a specific community ban within a specific community.
 *
 * This operation records a point-in-time child snapshot under an existing community ban so that moderation history can be inspected later without changing the parent resource path or community scope. The underlying snapshot table, `community_platform_community_ban_snapshots`, is defined as a historical snapshot linkage record for `community_platform_community_bans` and preserves child-specific audit attribution through its `created_by_member_id` field. The parent ban, stored in `community_platform_community_bans`, represents a community-scoped participation restriction for one member in one `community_platform_communities` space and carries the active business attributes such as `reason`, `status`, `started_at`, `expired_at`, and `lifted_at`.
 *
 * The operation must be used only in the context of a single identified community and a single identified ban. This matches the business rule that a community ban applies only within the selected community and must not be created or interpreted outside that community boundary. The `communityId` path parameter therefore identifies the community business space, and the `banId` path parameter identifies the parent ban record that must already belong to that same community. If the provided ban does not belong to the provided community, the request must be rejected rather than creating a detached or cross-community audit record.
 *
 * From a permissions perspective, this endpoint is intended for authenticated members who hold moderation authority in the target community, such as the community owner or delegated moderator. Guests must not be allowed to create moderation history. The operation supports moderation accountability by preserving who recorded the snapshot entry when that audit attribution is available. Because community bans restrict posting and commenting while preserving community visibility, the snapshot is part of moderation governance and audit tracking rather than content visibility control.
 *
 * This operation is related to the community ban creation and management workflow. A ban would first be created through the corresponding community-ban management API, and this snapshot endpoint is then used to append historical audit entries beneath that ban. Consumers should therefore treat this endpoint as dependent on the prior existence of the parent community and ban resources. The response returns the created snapshot resource so clients can immediately reference the newly recorded moderation-history item.
 *
 * @param props.connection
 * @param props.communityId Target community ID that scopes the moderation action
 * @param props.banId Target community ban ID within the specified community
 * @param props.body Creation payload for a new community ban snapshot
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a nested create operation for `community_platform_community_ban_snapshots`.
 *
 * 1. Authenticate the caller and require member identity. Authorize only callers with moderation authority in the target community, such as the community owner or a community moderator assigned to that community.
 * 2. Validate `communityId` as a UUID and load the target record from `community_platform_communities` by `id`. Reject when the community does not exist or is not available for moderation actions.
 * 3. Validate `banId` as a UUID and load the target record from `community_platform_community_bans` by `id`. Reject when the ban does not exist, has been logically removed, or does not belong to `communityId`.
 * 4. Create a new `community_platform_community_ban_snapshots` row using the parent `community_platform_community_ban_id = banId` and the request body fields from `ICommunityPlatformCommunityBanSnapshot.ICreate`. The implementation must not allow the client to override the parent linkage outside the path context.
 * 5. If the creation DTO includes audit attribution input, normalize it against the authenticated moderator identity. If audit attribution is system-derived, populate `created_by_member_id` from the authenticated member instead of trusting arbitrary client input.
 * 6. Persist the snapshot in a transaction together with any related moderation-history side effects required by the service layer.
 * 7. Return the created snapshot entity as `ICommunityPlatformCommunityBanSnapshot`.
 *
 * Error handling:
 * - Reject when the community is missing.
 * - Reject when the ban is missing.
 * - Reject when the ban belongs to a different community.
 * - Reject when the caller lacks community moderation authority.
 * - Reject invalid request-body data according to the generated DTO constraints.
 *
 * Implementation notes:
 * - Treat snapshot creation as audit-history insertion only; do not mutate the parent ban's business state unless a separate moderation workflow explicitly requires it.
 * - Preserve community isolation so that moderation records for one community never mix with another community's data.
 * - Do not implement archive behavior here; the requirements define no separate archived state for bans or moderation records.
 * @path /communityPlatform/admin/communities/:communityId/bans/:banId/snapshots
 * @accessor api.functional.communityPlatform.admin.communities.bans.snapshots.create
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
     * Target community ID that scopes the moderation action
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target community ban ID within the specified community
     */
    banId: string & tags.Format<"uuid">;

    /**
     * Creation payload for a new community ban snapshot
     */
    body: ICommunityPlatformCommunityBanSnapshot.ICreate;
  };
  export type Body = ICommunityPlatformCommunityBanSnapshot.ICreate;
  export type Response = ICommunityPlatformCommunityBanSnapshot;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/admin/communities/:communityId/bans/:banId/snapshots",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans/${encodeURIComponent(props.banId ?? "null")}/snapshots`;
  export const random = (): ICommunityPlatformCommunityBanSnapshot =>
    typia.random<ICommunityPlatformCommunityBanSnapshot>();
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

/**
 * Retrieve a filtered and paginated list of moderation history snapshot entries for a specific community ban within a specific community.
 *
 * This operation exposes the historical audit trail represented by the community ban snapshot records that belong to one community-scoped ban. In the database model, community_platform_community_bans stores the current business state of a participation ban applied to one member in one community, including its moderation reason, lifecycle status, effective start time, optional expiration time, optional manual lift time, and record timestamps. The related community_platform_community_ban_snapshots table stores point-in-time historical snapshot linkage records for that ban and preserves child-specific audit attribution for moderation history inspection. Consumers use this endpoint to browse those historical entries in a controlled, community-bounded context.
 *
 * Security for this operation should be aligned with community moderation visibility. The endpoint is intended for authorized moderation viewers, such as the community owner, delegated community moderators, and platform administrators when elevated oversight is permitted by the service. It must not expose snapshot history outside the identified community boundary. The service must therefore verify that the specified ban belongs to the specified community before returning any data, and it must reject attempts to inspect ban history through mismatched or non-existent community and ban identifiers.
 *
 * This endpoint is closely tied to the business rule that community bans are community-specific participation restrictions. The requirements state that bans apply only within the selected community, that active bans remain identifiable in the banned-user list until removed, and that removed bans are no longer shown as actively banned. Snapshot entries provide the historical context around that lifecycle. Because the platform does not define a separate archived business state for moderation records, this operation should present historical entries as part of moderation history inspection rather than as access to a separate archive.
 *
 * Clients should typically obtain the surrounding ban context from ban-oriented community moderation APIs before calling this endpoint. After identifying the target ban record for a community, this operation can be used to browse the related snapshot timeline, review who recorded snapshot entries when attribution exists, and inspect the evolution of the ban record over time. The result should support consistent pagination and ordering so moderation tools can navigate long histories predictably.
 *
 * If the community does not exist, the ban does not exist, the ban does not belong to the specified community, or the caller lacks moderation visibility for that community, the operation must fail rather than leaking whether unrelated moderation data exists elsewhere. If no snapshot entries exist for the specified ban, the operation should return an empty paginated result set.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.banId Target community ban's ID within the specified community
 * @param props.body Pagination, sorting, and filter criteria for community ban snapshots
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement this operation as a paginated history query over community_platform_community_ban_snapshots constrained by a validated parent community ban context.
 *
 * First, authenticate the caller and authorize moderation-history access for the target community. Accept member actors only when they hold the appropriate owner or community moderator authority for the specified community, and allow admin actors only if platform policy grants administrative oversight. Reject guests.
 *
 * Resolve the parent ban by querying community_platform_community_bans using the provided banId and communityId together. The lookup must confirm that community_platform_community_bans.id equals banId, community_platform_community_bans.community_platform_community_id equals communityId, and the record is not logically removed unless the product explicitly allows moderation review of logically removed bans. If no such parent record exists, return a not-found style error. Do not query snapshots before validating the parent relationship.
 *
 * Query community_platform_community_ban_snapshots where community_platform_community_ban_id equals the resolved parent ban id. Join the optional createdByMember relation when attribution data is needed in the DTO. Support request-body driven pagination, sorting, and optional filters that are actually available from the loaded schema, such as filtering by snapshot id, filtering by created_by_member_id presence or exact value, and date-window or cursor conditions based on a stable ordering strategy derived from snapshot identity or related timeline semantics. Default ordering should be deterministic for audit browsing, such as newest-first by snapshot id or a service-defined historical sequence if available in generated DTO composition.
 *
 * Construct summary DTO items from the snapshot records and any permitted joined attribution data. Ensure the paginated response includes standard pagination metadata and the list of snapshot summary items. If no rows match after filtering, return an empty page rather than an error.
 *
 * Error handling must cover: unauthorized or forbidden access; unknown community; unknown ban; ban not belonging to the specified community; and invalid pagination or filter input. Keep the implementation read-only. Do not create, update, or remove snapshot rows in this operation because snapshot records represent historical moderation state tracking rather than user-managed content.
 * @path /communityPlatform/admin/communities/:communityId/bans/:banId/snapshots
 * @accessor api.functional.communityPlatform.admin.communities.bans.snapshots.index
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
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target community ban's ID within the specified community
     */
    banId: string & tags.Format<"uuid">;

    /**
     * Pagination, sorting, and filter criteria for community ban snapshots
     */
    body: ICommunityPlatformCommunityBanSnapshot.IRequest;
  };
  export type Body = ICommunityPlatformCommunityBanSnapshot.IRequest;
  export type Response = IPageICommunityPlatformCommunityBanSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/admin/communities/:communityId/bans/:banId/snapshots",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans/${encodeURIComponent(props.banId ?? "null")}/snapshots`;
  export const random =
    (): IPageICommunityPlatformCommunityBanSnapshot.ISummary =>
      typia.random<IPageICommunityPlatformCommunityBanSnapshot.ISummary>();
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

/**
 * Retrieve a single historical snapshot record for a community participation ban within its full moderation context.
 *
 * This operation returns one point-in-time snapshot entry from the community ban history associated with the specified community and parent ban. The underlying snapshot entity, `community_platform_community_ban_snapshots`, is described as a child history record that preserves child-specific audit attribution for moderation history inspection. Its parent entity, `community_platform_community_bans`, represents a community-scoped participation restriction for one member within one `community_platform_communities` space. The response is therefore intended for moderation and audit use cases where a client needs to inspect a specific historical ban snapshot rather than the current active-ban list.
 *
 * Authorization for this operation should be restricted to actors who currently hold moderation authority in the target community. The loaded requirements define ban creation and banned-user review as moderator activities, and they require moderation actions to be limited to the selected community. This endpoint must not expose moderation history across community boundaries. Even though a banned member may continue viewing the community and its posts and comments, that visibility rule applies to public community content and does not imply access to moderation audit records.
 *
 * The route structure intentionally includes the community identifier, the parent ban identifier, and the snapshot identifier. This reflects the database relationship chain in which a snapshot belongs to a single `community_platform_community_bans` record, and the ban belongs to a single `community_platform_communities` record. The operation must validate that the requested snapshot is actually attached to the specified ban and that the ban is actually attached to the specified community before returning data. If any link in that chain does not match, the request must be treated as not found or unauthorized according to the service's error policy. This behavior supports the non-functional requirement that moderation data for one community remain separate from moderation data for other communities.
 *
 * The returned resource should include the snapshot's own identity and audit attribution, while allowing consumers to understand that current ban business attributes such as reason, status, started time, expiration time, and lift time are owned by the parent `community_platform_community_bans` record. Because the snapshot model comment explicitly states that parent ban state and business attributes must be accessed through the ban relationship rather than duplicated in the child table, the implementation should resolve and present the snapshot in a way that respects this boundary. Clients typically use this endpoint after first locating the relevant ban through community-level moderation screens and then drilling into one specific snapshot record for detailed inspection.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.banId Target community ban's ID
 * @param props.snapshotId Target ban snapshot's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a read-only service that retrieves one community ban snapshot by joining `community_platform_community_ban_snapshots` to its parent `community_platform_community_bans` and validating the enclosing `community_platform_communities` scope.
 *
 * Lookup flow:
 * 1. Validate that `communityId`, `banId`, and `snapshotId` are UUID-shaped path inputs.
 * 2. Load the snapshot record from `community_platform_community_ban_snapshots` by `id = snapshotId`.
 * 3. Join or separately load the parent ban from `community_platform_community_bans` where `id = community_platform_community_ban_id` and ensure it matches `banId`.
 * 4. Validate that the parent ban's `community_platform_community_id` matches `communityId`.
 * 5. Optionally load the community from `community_platform_communities` to verify existence and support authorization checks in community scope.
 * 6. Optionally load the member referenced by `created_by_member_id` when the DTO requires creator details.
 *
 * Authorization rules:
 * - Require an authenticated member actor.
 * - Confirm the caller currently has moderation authority in the specified community before returning the snapshot.
 * - Deny access when the caller is not an owner or moderator for that community.
 *
 * Business and data integrity rules:
 * - Enforce strict hierarchical ownership: the snapshot must belong to the specified ban, and the ban must belong to the specified community.
 * - Do not return a snapshot from another community even if the caller knows the raw UUIDs.
 * - Treat logically removed parent records consistently with the service policy. In particular, if the ban record is marked by `deleted_at`, the service should not expose it as an active moderation resource unless historical-audit policy explicitly allows it.
 * - Because the snapshot table comment states that parent ban state and business attributes are accessed through the ban relationship rather than duplicated in the snapshot table, map parent information through relations instead of fabricating duplicate fields.
 *
 * Response mapping:
 * - Return a single `ICommunityPlatformCommunityBanSnapshot` object.
 * - Include snapshot identity and audit attribution from `community_platform_community_ban_snapshots`.
 * - Include parent ban context as defined by the DTO schema if required by the generated components.
 *
 * Error handling:
 * - Return not found when the community does not exist, the ban does not exist, the snapshot does not exist, or the hierarchy does not match.
 * - Return forbidden when the caller lacks moderation authority in the specified community.
 * - Handle null `created_by_member_id` safely because the schema permits it.
 * - This operation performs no mutation and must run without a write transaction.
 * @path /communityPlatform/admin/communities/:communityId/bans/:banId/snapshots/:snapshotId
 * @accessor api.functional.communityPlatform.admin.communities.bans.snapshots.at
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
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target community ban's ID
     */
    banId: string & tags.Format<"uuid">;

    /**
     * Target ban snapshot's ID
     */
    snapshotId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityBanSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/communities/:communityId/bans/:banId/snapshots/:snapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/bans/${encodeURIComponent(props.banId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityBanSnapshot =>
    typia.random<ICommunityPlatformCommunityBanSnapshot>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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

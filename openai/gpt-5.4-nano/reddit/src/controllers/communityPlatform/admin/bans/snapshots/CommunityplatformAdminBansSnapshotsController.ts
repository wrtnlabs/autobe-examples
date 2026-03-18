import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityBanSnapshot } from "../../../../../api/structures/ICommunityPlatformCommunityBanSnapshot";
import { IPageICommunityPlatformCommunityBanSnapshot } from "../../../../../api/structures/IPageICommunityPlatformCommunityBanSnapshot";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getCommunityPlatformAdminBansBanIdSnapshotsSnapshotId } from "../../../../../providers/getCommunityPlatformAdminBansBanIdSnapshotsSnapshotId";
import { patchCommunityPlatformAdminBansBanIdSnapshots } from "../../../../../providers/patchCommunityPlatformAdminBansBanIdSnapshots";
import { postCommunityPlatformAdminBansBanIdSnapshots } from "../../../../../providers/postCommunityPlatformAdminBansBanIdSnapshots";

@Controller("/communityPlatform/admin/bans/:banId/snapshots")
export class CommunityplatformAdminBansSnapshotsController {
  /**
   * Create a new point-in-time snapshot for a community ban.
   *
   * This operation records a moderation state capture for the ban identified by `{banId}` into the community ban snapshot model (community_platform_community_ban_snapshots). Each snapshot row stores the ban’s effective timestamps (`effective_from`, `effective_until`), the moderation status at that moment (`ban_status`), and the moderator’s provided reason (`reason`). The snapshot also persists auditing timestamps (`created_at`, `updated_at`) managed by the data model.
   *
   * Moderation history correctness is critical: snapshots are used to render moderation timelines deterministically even if the live ban record changes later. This aligns with the requirement that banned users cannot create posts or comments while the ban is active, that banned users can still view content, and that unbanning restores posting and commenting eligibility. By writing snapshots for ban state transitions, the system can later show consistent history for audits and UI moderation views.
   *
   * Authorization: only privileged moderation actors (community owner or permitted moderators) who can manage bans for the target community may create snapshot records. Guests and non-moderator members must be denied.
   *
   * Validation and error handling: the `{banId}` must identify an existing community ban row in community_platform_community_bans. The request must provide the snapshot’s state fields (including `ban_status`, `reason`, and effective time window fields) consistent with the ban lifecycle timeline. If the ban does not exist or is not accessible to the caller’s moderation scope, the system must reject the request.
   *
   * Related operations: this snapshot creation is typically invoked alongside ban application and ban lifting actions (ban lifecycle workflow). After a moderator applies or lifts a ban, the system can create an appropriate snapshot so that subsequent moderation views reflect the captured state at each effective moment.
   *
   * @param connection
   * @param banId Target community ban identifier that the snapshot belongs to.
   * @param body Snapshot creation payload capturing the ban’s state at a specific moment, including status, reason, and the effective time window.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1) Extract `banId` from path.
   * 2) Authorize caller as community owner or an assigned moderator for the community that owns the ban.
   *    - Resolve `community_platform_community_bans` by `id = banId`.
   *    - Join to `community_platform_communities` (community_id) to validate moderation scope.
   *    - Validate caller’s moderator assignment via `community_platform_community_moderators` and/or ownership via `community_platform_communities.community_owner_id`.
   * 3) Validate request body fields for the snapshot record:
   *    - `ban_status`: must be a non-empty string as required by the snapshot model.
   *    - `reason`: must be a non-empty string.
   *    - `effective_from`: must be provided; it defines when this snapshot becomes effective.
   *    - `effective_until`: may be null; if provided, it must not be earlier than `effective_from` (time window sanity).
   * 4) Insert into `community_platform_community_ban_snapshots` with:
   *    - `community_ban_id = banId`
   *    - `community_id`, `banned_user_id`, `applied_by_moderator_id` derived from the target ban row and authenticated moderator identity.
   *    - store `ban_status`, `reason`, `effective_from`, `effective_until`.
   *    - let `created_at`/`updated_at` be set by the application or database defaults.
   * 5) Return the created snapshot row mapped to the `ICommunityPlatformCommunityBanSnapshot` response DTO.
   *
   * Edge cases:
   * - If the banId does not exist -> return 404.
   * - If caller is not authorized for the ban’s community -> return 403.
   * - If time window is invalid -> return 400.
   * - Do not create snapshots for soft-deleted ban records if your service layer treats deleted_at as inactive (follow current active-record policy consistent with other operations).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createBanSnapshot(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityBanSnapshot.ICreate,
  ): Promise<ICommunityPlatformCommunityBanSnapshot> {
    try {
      return await postCommunityPlatformAdminBansBanIdSnapshots({
        admin,
        banId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the timeline of ban snapshots associated with a specific community ban.
   *
   * This operation is bound to the community ban timeline concept: each snapshot row captures the point-in-time state of a community ban, including the banned user, moderator attribution, ban status, reason, and the effective time window at that moment. The endpoint uses the provided ban identifier to scope which snapshot history rows are returned.
   *
   * Authorization-wise, this operation must be restricted to actors who are allowed to view moderation history for that community ban. Depending on the actor type, authorization should be enforced before querying snapshots so that no snapshot records leak across community boundaries.
   *
   * Implementation-wise, this operation must query `community_platform_community_ban_snapshots` filtered by `community_ban_id = {banId}` and return results ordered by `created_at` (or `effective_from` if the client requests chronological rendering), applying pagination controls.
   *
   * Validation rules should ensure the ban identifier is a valid UUID and that pagination parameters are within acceptable bounds. If the ban does not exist or the caller has no permission to view it, the system must reject the request with an appropriate authorization or not-found style error.
   *
   * This endpoint pairs naturally with ban history browsing in moderation views and complements the live ban record access. When both live ban and snapshot history are displayed, clients should use this operation for historical rendering and the live ban endpoints for current state.
   *
   * @param connection
   * @param banId Target community ban ID whose snapshot history is requested.
   * @param body Filtering and pagination criteria for snapshot timeline browsing scoped to the given ban.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Validate `banId` as UUID.
   * 2) Authorize caller to view moderation history for the community ban referenced by `community_platform_community_bans.id`.
   * 3) Parse request body criteria (pagination/sorting; optionally effectiveFrom/effectiveUntil if present in request DTO) from `ICommunityPlatformCommunityBanSnapshot.IRequest`.
   * 4) Query `community_platform_community_ban_snapshots` where `community_ban_id = banId`.
   * 5) Apply filters if provided (e.g., restrict by `effective_from`/`effective_until`).
   * 6) Apply ordering: default by `created_at` desc; if criteria indicates chronological, order by `effective_from` asc.
   * 7) Apply pagination (limit/offset or cursor per DTO contract).
   * 8) Project each row into `ICommunityPlatformCommunityBanSnapshot.ISummary` fields.
   * 9) Return `IPageICommunityPlatformCommunityBanSnapshot.ISummary` including pagination metadata.
   * 10) Edge cases: if no snapshots exist, return an empty page; do not error.
   * 11) Error handling: on invalid input, return 4xx; on authorization failure, return 403/appropriate; on ban id not found, return 404/appropriate.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateSnapshots(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityBanSnapshot.IRequest,
  ): Promise<IPageICommunityPlatformCommunityBanSnapshot.ISummary> {
    try {
      return await patchCommunityPlatformAdminBansBanIdSnapshots({
        admin,
        banId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single point-in-time ban snapshot for a specific community ban.
   *
   * This operation returns the snapshot record from the community ban snapshot model, which represents the ban’s state as captured at the time the snapshot was created (including the effective time window and moderation metadata). The snapshot is intended for deterministic rendering of moderation history even if the live ban record changes later.
   *
   * Access is restricted to actors who can view moderation/audit history within the associated community scope. If the provided banId/snapshotId pair does not align (or the snapshot is missing), the system must return a not-found style error. If the actor lacks permission for the relevant community, return an authorization/forbidden style error.
   *
   * The operation is read-only: it does not change community bans, subscription eligibility, or posting/commenting permissions.
   *
   * Related operations: moderation UIs typically list available ban snapshots from a parent moderation context (if such list endpoints exist), and then call this operation to fetch each snapshot’s details.
   *
   * @param connection
   * @param banId Target community ban ID that the snapshot belongs to.
   * @param snapshotId Target community ban snapshot ID to retrieve the point-in-time ban record.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1. Parse and validate path parameters:
   *    - banId and snapshotId are UUID strings.
   *
   * 2. Query snapshot record:
   *    - Fetch the row from community_platform_community_ban_snapshots by id = snapshotId.
   *    - If not found, return not-found.
   *
   * 3. Enforce ban scope consistency:
   *    - Verify snapshot.community_ban_id == banId.
   *    - If it mismatches, return not-found (avoid leaking whether the snapshot exists under another ban).
   *
   * 4. Authorization:
   *    - Determine the target community_id from the snapshot row.
   *    - Enforce actor permission to view moderation/audit snapshots for that community.
   *
   * 5. Response mapping:
   *    - Return the snapshot DTO fields from the snapshot row: id, community_ban_id, community_id, banned_user_id, applied_by_moderator_id, ban_status, reason, effective_from, effective_until, created_at, updated_at.
   *
   * 6. No transaction is required because this is a read-only operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityBanSnapshot> {
    try {
      return await getCommunityPlatformAdminBansBanIdSnapshotsSnapshotId({
        admin,
        banId,
        snapshotId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

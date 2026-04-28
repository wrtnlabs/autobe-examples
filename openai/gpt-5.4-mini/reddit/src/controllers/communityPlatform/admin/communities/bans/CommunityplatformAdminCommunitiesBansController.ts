import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformBan } from "../../../../../api/structures/ICommunityPlatformBan";
import { IPageICommunityPlatformBan } from "../../../../../api/structures/IPageICommunityPlatformBan";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteCommunityPlatformAdminCommunitiesCommunityIdBansBanId } from "../../../../../providers/deleteCommunityPlatformAdminCommunitiesCommunityIdBansBanId";
import { getCommunityPlatformAdminCommunitiesCommunityIdBansBanId } from "../../../../../providers/getCommunityPlatformAdminCommunitiesCommunityIdBansBanId";
import { patchCommunityPlatformAdminCommunitiesCommunityIdBans } from "../../../../../providers/patchCommunityPlatformAdminCommunitiesCommunityIdBans";
import { postCommunityPlatformAdminCommunitiesCommunityIdBans } from "../../../../../providers/postCommunityPlatformAdminCommunitiesCommunityIdBans";
import { putCommunityPlatformAdminCommunitiesCommunityIdBansBanId } from "../../../../../providers/putCommunityPlatformAdminCommunitiesCommunityIdBansBanId";

@Controller("/communityPlatform/admin/communities/:communityId/bans")
export class CommunityplatformAdminCommunitiesBansController {
  /**
   * Create a new ban record for a member within the specified community.
   *
   * This operation records a community-scoped moderation enforcement action in the community_platform_bans table. A ban belongs to exactly one community and exactly one member, and it exists to limit that member’s participation only inside the targeted community while preserving their access to the rest of the platform. The stored ban includes the moderation reason, the time the ban becomes effective, and an optional end time for temporary restrictions.
   *
   * Only the community owner and members with moderation authority in the same community may create this record. The platform must verify that the acting moderator is authorized for the community identified by the path parameter, and it must verify that the target member exists and can be associated with that community. The ban should be created as a new record rather than updating an existing one, preserving the ban history and supporting the database uniqueness rule on community, member, and start time.
   *
   * The created ban immediately serves as the source of current ban status for that member in the community. Once recorded, the system uses this ban to block new post creation and new comment creation in the affected community, while still allowing content viewing. Related moderation operations such as viewing banned users and removing a ban are typically used alongside this endpoint to manage the full enforcement lifecycle.
   *
   * @param connection
   * @param communityId Target community identifier.
   * @param body Ban creation details for the target member.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement this as a moderation-only create flow
     *   for community_platform_bans.
   *
   * 1. Resolve the community by communityId from the path and verify it exists and is not deleted.
   * 2. Authenticate the caller and confirm they hold moderation authority for that community. Accept either owner or moderator role from community_platform_moderation_roles, excluding deleted role rows.
   * 3. Validate the request body:
   *    - target member must exist
   *    - reason must be a non-empty text value
   *    - endedAt, if provided, must be later than startedAt or later than the current effective time if startedAt is system-generated now
   *    - do not accept id, createdAt, updatedAt, or deletedAt from the client
   * 4. Before insert, ensure the target member can be banned in that community. If the platform policy requires active-ban uniqueness, check for an existing active ban for the same community/member combination; if the product allows multiple ban history rows, permit insertion as long as the new started_at is unique for the pair.
   * 5. Insert a new community_platform_bans row with:
   *    - generated UUID id
   *    - community_platform_community_id from path
   *    - community_platform_member_id from body
   *    - reason from body
   *    - started_at set to now if the client does not provide an effective start time, otherwise use the validated effective start timestamp
   *    - ended_at from body when provided
   *    - created_at and updated_at set to now
   *    - deleted_at null
   * 6. Use a transaction if any pre-checks require reading roles and existing bans together to prevent race conditions.
   * 7. Return the created ban entity immediately after insert.
   * 8. Error handling:
   *    - 403 when caller lacks moderation authority
   *    - 404 when community or target member does not exist
   *    - 409 when the unique ban identity would conflict with an existing row
   *    - 422 for invalid reason or invalid end time
   * 9. Ensure the downstream moderation flow can use this ban record to block future post/comment creation in that community.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformBan.ICreate,
  ): Promise<ICommunityPlatformBan> {
    try {
      return await postCommunityPlatformAdminCommunitiesCommunityIdBans({
        admin,
        communityId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the paginated list of ban records for a specific community.
   *
   * This operation returns the community-scoped moderation enforcement records stored in community_platform_bans, which track the affected member, the target community, the moderation reason, the time the ban started, the optional end time, and the timestamps that allow moderators to review the ban lifecycle. The list is intended for community owners and moderators who need to confirm which users are currently restricted in that community and why the restriction exists.
   *
   * The ban scope is strictly limited to the community identified by the path parameter. A ban record belongs to exactly one community and one member, and the same member may have a different participation status in other communities. The returned collection should therefore never mix records from other communities, and it should respect the record lifecycle by focusing on active bans for the current moderation view while still allowing pagination and search over the community's ban history as needed by the interface.
   *
   * This endpoint supports moderation workflows where the owner or a moderator checks the current restriction state before taking further action. The service should use the community_platform_bans community index and member/community relationship columns to load the records efficiently, apply any active-status filtering against ended_at and deleted_at, and return summary data suitable for a banned-users list display.
   *
   * @param connection
   * @param communityId Target community ID
   * @param body Search, filtering, and pagination criteria for the community ban list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement a paginated ban listing query scoped to
     *   one community.
   *
   * Resolve the community by communityId, verify the caller is the community owner or a moderator assigned to that community, and reject access for unauthorized users. Query community_platform_bans using community_platform_community_id = communityId, and exclude records that are not currently visible to moderation browsing if the business layer treats ended or deleted bans as inactive. Use created_at or started_at ordering consistently, with the newest bans first unless the request DTO specifies another allowed sort.
   *
   * Support filtering and search in the request body, including an active-state filter, member lookup keywords, reason text search, and pagination controls. Because the schema includes an index on (community_platform_community_id, created_at) and another on (community_platform_community_id, community_platform_member_id, ended_at), prefer those indexes for the list query. If the implementation needs member display information, load it through a joined read from community_platform_members using the foreign key relation, but do not expand unrelated community details.
   *
   * Return a paginated summary payload that includes the banned member reference, community reference, reason, startedAt, endedAt, createdAt, updatedAt, and any derived current-status indicator needed by the list UI. Treat ended_at as the natural end of a temporary ban and deleted_at as a removed record marker. Validate that communityId is a UUID, enforce pagination limits, and ensure search terms are safely parameterized to avoid full-table scans.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformBan.IRequest,
  ): Promise<IPageICommunityPlatformBan.ISummary> {
    try {
      return await patchCommunityPlatformAdminCommunitiesCommunityIdBans({
        admin,
        communityId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single ban record for a specific community and banned member.
   *
   * This operation returns the moderation ban record that belongs to the community identified by `communityId` and the ban record identified by `banId`. The ban record is the platform's community-scoped enforcement object for restricting a member from posting or commenting inside one specific community while preserving read-only access to content. Its data model includes the affected member reference, the target community reference, the moderation reason, the effective start time, the optional end time for temporary bans, and the creation/update timestamps used for moderation auditing.
   *
   * This endpoint is intended for community moderation workflows. Moderators and owners can use it to inspect an active or historical ban, confirm that the ban belongs to the correct community, and verify the reason and enforcement timing before taking further moderation action. The response is also useful when presenting the banned users list for a community, since that list is limited to bans within the same community and should only reflect currently active enforcement records.
   *
   * Because a ban is strictly community-specific, the operation must always resolve the ban within the context of the community path segment. The service must confirm that the ban record belongs to the requested community before returning it, and must reject access when the caller does not have moderation authority in that community. The returned ban data should not imply any account-level restriction beyond the target community, since bans are designed as participation limitations rather than platform-wide account punishments.
   *
   * @param connection
   * @param communityId Target community's unique identifier.
   * @param banId Target ban record's unique identifier within the community scope.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Load the ban record by communityId and banId in a
     *   single read operation.
   *
   * Implementation should first verify that the authenticated actor has moderation authority in the requested community. Then query community_platform_bans by id = banId and community_platform_community_id = communityId, ensuring the record exists and belongs to the same community scope. Because the schema defines a direct relation to both community_platform_communities and community_platform_members, the read should include those relations or at least validate ownership/association so the response can be trusted as community-scoped.
   *
   * Return 404 when the ban does not exist or does not belong to the given community. Return 403 when the caller lacks moderator or owner authority for that community. No mutation is performed, so no transaction is required. Include the ban's id, member reference, community reference, reason, started_at, ended_at, created_at, updated_at, and deleted_at in the response schema representation if the project response DTO includes those fields. Do not assume any additional status field exists; the schema only guarantees the listed columns.
   *
   * If the implementation treats deleted_at as a removal marker, the read behavior must follow project-wide lifecycle rules for whether revoked bans remain retrievable; however, the endpoint itself should still resolve by the actual ban record identity and preserve the community scope checks before returning data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":banId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformBan> {
    try {
      return await getCommunityPlatformAdminCommunitiesCommunityIdBansBanId({
        admin,
        communityId,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a ban record within a specific community.
   *
   * This operation lets authorized community moderators or the community owner revise an existing ban entry that belongs to the specified community. The underlying record is stored in `community_platform_bans`, which keeps the affected member, the target community, the moderation reason, and the ban lifecycle timestamps together as a normalized moderation record.
   *
   * The ban remains community-scoped at all times: the same member may have different participation status in other communities, and this update only affects the ban record identified by the combination of community and ban identifiers. The endpoint should be used when a moderator needs to adjust the ban reason, change the effective window, or correct ban metadata while preserving the original moderation context.
   *
   * Only users with moderation authority in the target community should be allowed to perform this operation. The implementation must verify that the ban belongs to the requested community before applying any changes. If the ban does not exist in that community, the request must fail as not found rather than updating a ban from another community.
   *
   * Validation must preserve the business rules for community bans: the ban continues to restrict posting and commenting in that community, but it does not affect visibility of content or participation in other communities. The service must also maintain the record timestamps consistently and should reject invalid date transitions such as an end time that precedes the start time.
   *
   * @param connection
   * @param communityId Target community ID that owns the ban.
   * @param banId Target ban ID within the specified community.
   * @param body Fields to update on the community ban record.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Load the ban by composite scope: communityId path
     *   parameter plus banId path parameter. First verify the authenticated
     *   actor has moderation authority for the given community (owner or
     *   permitted moderator role according to moderation rules). Then fetch the
     *   ban row from community_platform_bans using both id = banId and
     *   community_platform_community_id = communityId to prevent
     *   cross-community access.
   *
   * Apply partial field updates from the request body to mutable ban fields only. Reason is the primary editable moderation note. If the schema allows changing the ban period, validate started_at and ended_at as a coherent interval; ended_at may be null for an ongoing ban, but if provided it must not be earlier than started_at. Do not allow updates to immutable identity fields such as id, community_platform_member_id, or community_platform_community_id.
   *
   * Persist the update in a single transaction and update updated_at to the current timestamp. Keep deleted_at unchanged; this endpoint is for updating an existing ban record, not revoking or removing it. After save, return the updated ban entity for moderation UIs.
   *
   * Error handling: return 404 if the ban does not belong to the specified community or cannot be found, 403 if the actor lacks moderation rights, and 400 for invalid date or payload constraints. If concurrent modification is detected, prefer a standard optimistic retry or last-write-wins policy consistent with the platform’s service conventions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":banId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformBan.IUpdate,
  ): Promise<ICommunityPlatformBan> {
    try {
      return await putCommunityPlatformAdminCommunitiesCommunityIdBansBanId({
        admin,
        communityId,
        banId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a ban from a community and stop enforcing the restriction against the targeted member.
   *
   * This operation is used by community moderators and community owners to revoke a ban that was previously applied within the same community. The ban record belongs to the community moderation domain and is stored in the community_platform_bans table, which keeps the affected member, the target community, the moderation reason, and lifecycle timestamps. Because the record is scoped to one community and one member, the ban can only be erased through the matching community identifier and ban identifier pair.
   *
   * Only actors with moderation authority in the community may perform this action. The community_platform_moderation_roles table defines whether the caller is an owner or moderator for the community, and that authority is required before the ban can be removed. If the caller does not hold sufficient authority in the requested community, the request must be rejected.
   *
   * Removing the ban makes the member eligible to participate again in that community, including posting and commenting. The operation should verify that the ban belongs to the requested community before removal, and it should reject requests where the ban identifier does not match the community scope. Related moderation flows include viewing the banned users list, creating bans, and managing moderator roles within the community.
   *
   * @param connection
   * @param communityId Target community's ID that owns the ban.
   * @param banId Ban record ID to remove within the specified community.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement a community-scoped ban revocation
     *   endpoint.
   *
   * 1. Resolve the current actor and confirm they have moderation authority for the target community by checking community_platform_moderation_roles for an active owner or moderator assignment in the requested community.
   * 2. Load the ban by id from community_platform_bans and ensure the ban's community_platform_community_id matches the path communityId. If not found or mismatched, return a not-found response to avoid leaking cross-community identifiers.
   * 3. Confirm the ban is currently active for moderation purposes. If the record has already been removed from enforcement, treat the deletion as idempotent only if the product standard allows it; otherwise return not-found.
   * 4. Remove the ban record according to the platform's deletion strategy for this table, which includes the schema's deleted_at lifecycle field. Preserve audit-friendly timestamps and avoid modifying unrelated community or member data.
   * 5. Ensure downstream moderation views and banned-user listings no longer include the revoked ban for that community.
   * 6. Do not touch community membership, posts, comments, or account records. This endpoint only revokes the moderation enforcement record.
   *
   * Handle authorization failures with forbidden, invalid community/ban combinations with not-found, and unexpected persistence errors with a generic server error.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":banId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformAdminCommunitiesCommunityIdBansBanId({
        admin,
        communityId,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

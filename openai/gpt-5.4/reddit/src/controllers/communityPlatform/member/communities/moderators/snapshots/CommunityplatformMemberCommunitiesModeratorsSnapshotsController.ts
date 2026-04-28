import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityModeratorSnapshot } from "../../../../../../api/structures/ICommunityPlatformCommunityModeratorSnapshot";
import { IPageICommunityPlatformCommunityModeratorSnapshot } from "../../../../../../api/structures/IPageICommunityPlatformCommunityModeratorSnapshot";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshotsSnapshotId } from "../../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshotsSnapshotId";
import { patchCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots } from "../../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots";
import { postCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots } from "../../../../../../providers/postCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots";

@Controller(
  "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/snapshots",
)
export class CommunityplatformMemberCommunitiesModeratorsSnapshotsController {
  /**
   * Create a new historical snapshot entry for a specific community moderator assignment.
   *
   * This operation records a point-in-time snapshot event in the history stream of a moderator assignment that belongs to a particular community. The underlying snapshot table is defined as an append-only historical record for community moderator assignment snapshot events, and each row belongs to one community moderator assignment while storing the time the snapshot entry was created. In business terms, this endpoint supports community governance traceability by preserving a historical marker for a moderator assignment without changing the assignment's current role, status, grant metadata, or revocation metadata.
   *
   * Access to this operation is restricted to authenticated members who already hold governance authority in the same community, specifically the community owner or an active moderator acting within that community boundary. This follows the moderation hierarchy requirements stating that the owner is the highest authority in the community and that moderators operate only within the community where their standing was granted. The operation must therefore validate that the caller has moderation authority in the target community before allowing snapshot creation, and it must reject requests that attempt to operate across community boundaries or on moderator assignments outside the caller's community authority.
   *
   * The operation is grounded in the relationship between the community_platform_communities table, which stores the canonical community identity and owner membership reference, the community_platform_community_moderators table, which stores the community-scoped moderation assignment including role, status, grantor, revocation data, and lifecycle timestamps, and the community_platform_community_moderator_snapshots table, which stores only the snapshot record identity, parent linkage, and creation time. Because the snapshot table intentionally avoids duplicating assignment details, clients that need the current moderator state should use the parent moderator retrieval operation together with this creation endpoint rather than expecting the snapshot record itself to contain a denormalized copy of role data.
   *
   * Validation must ensure that the path communityId identifies the community owning the target moderator assignment and that moderatorId identifies an existing moderator assignment row in that same community. If the community does not exist, the moderator assignment does not exist, the assignment belongs to a different community, or the caller lacks community governance authority, the operation must fail without creating any snapshot row. The operation should also preserve the append-only nature of snapshot history: creating a snapshot adds a new historical entry and does not overwrite prior snapshots or alter any granted_at, revoked_at, status, role, or owner subtype data.
   *
   * This endpoint is typically used together with moderator management and governance inspection APIs. A client may first retrieve community moderator details to identify the correct moderator assignment, then call this operation to record a historical event, and later use snapshot listing or detail retrieval operations to inspect the resulting moderation history. This sequencing is important because the snapshot row references only the parent assignment and timestamp, while the broader business meaning remains anchored to the moderator assignment and community governance structures.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param moderatorId Target community moderator assignment's ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as an append-only
     *   creation workflow for community_platform_community_moderator_snapshots.
   *
   * 1. Authenticate the caller as a member. Guests are never eligible. Resolve the caller's member identity from the authenticated session.
   * 2. Load the target community from community_platform_communities by id = :communityId and deleted_at IS NULL. If not found, return a not-found error.
   * 3. Load the target moderator assignment from community_platform_community_moderators by id = :moderatorId and deleted_at IS NULL. If not found, return a not-found error.
   * 4. Verify that the loaded moderator assignment belongs to the path community by checking community_platform_community_moderators.community_platform_community_id = :communityId. If it does not match, return a validation or not-found style error to prevent cross-community access.
   * 5. Authorize the caller within the same community. The caller is allowed when either:
   *    - the caller is the owner member of the target community via community_platform_communities.community_platform_member_id, or
   *    - the caller has an active moderation assignment in community_platform_community_moderators for the same community with community_platform_member_id = callerMemberId, status indicating active standing, deleted_at IS NULL, and not revoked.
   *    If neither condition is satisfied, return a forbidden error.
   * 6. Optionally verify that the target moderator assignment itself is in a state eligible for snapshot recording according to service policy. At minimum, do not mutate the assignment state here.
   * 7. Insert a new row into community_platform_community_moderator_snapshots with a generated UUID id, community_platform_community_moderator_id = moderatorId, and created_at = now(). Do not accept any client-supplied body fields.
   * 8. Return the created snapshot record as the successful response payload.
   *
   * Implementation notes:
   * - Execute the authorization check and insert in a single service-layer transaction or otherwise consistent unit of work so the snapshot is created only after all validations pass.
   * - Do not update community_platform_community_moderators, community_platform_community_moderator_owners, or community_platform_communities in this endpoint.
   * - Do not infer ownership from the moderator assignment role string alone when the canonical community owner relationship is already available through the community record and owner subtype relationship.
   * - Preserve append-only history behavior; repeated calls may create multiple snapshot rows for the same moderator assignment at different times.
   * - Error handling should clearly distinguish not-found community, not-found moderator assignment, community-assignment mismatch, and insufficient governance authority.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityModeratorSnapshot> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(
        {
          member,
          communityId,
          moderatorId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of historical snapshot records for a specific community moderator assignment within a community.
   *
   * This operation exposes the audit-oriented history attached to a moderator assignment stored in the community_platform_community_moderator_snapshots table. Each snapshot row represents a point-in-time historical record for one community_platform_community_moderators assignment and records when that snapshot entry was created. The operation is scoped through both the community and the moderator assignment so that snapshot history is always resolved inside the same community governance boundary defined by the community_platform_communities record and its related moderation structure.
   *
   * Access to this operation is restricted to actors with moderation authority in the target community. The requirements define community moderation as a local, community-specific governance model in which the community owner is the highest authority and moderators act within the same community scope. In line with the rule that moderators may view moderation-related data only for their own community, the server must ensure that the caller is permitted to inspect moderation history for the specified community before returning any snapshot records.
   *
   * The underlying community_platform_community_moderators record identifies which member holds the moderation assignment, who granted it, what role classification it carries, and whether the assignment is active or revoked. This operation does not modify any of those fields. Instead, it allows clients to browse the append-only historical timeline associated with that assignment through its snapshots relation. Because the snapshot table stores only the snapshot identity, the parent assignment linkage, and the snapshot creation time, clients typically use this endpoint together with community moderator detail or listing operations when they need the broader context of the assignment being audited.
   *
   * The request body should be used to control pagination, sorting, and optional filters such as created-at ranges so that moderation history can be browsed efficiently over time. Results should be returned in a stable order, typically newest-first by created_at, and should be limited to snapshot records belonging to the specific moderator assignment under the specified community. If the community does not exist, the moderator assignment does not exist, the assignment does not belong to the community, or the caller lacks authority in that community, the operation must be rejected.
   *
   * @param connection
   * @param communityId Target community's unique identifier
   * @param moderatorId Target community moderator assignment's unique identifier
   * @param body Pagination, sorting, and filtering criteria for moderator assignment snapshots
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the caller and require a
     *   logged-in actor. 2. Load the target community_platform_communities row
     *   by communities.id using communityId and reject when not found. 3.
     *   Verify the caller has permission to view moderation data for the target
     *   community. Accept a member who holds an active owner or moderator
     *   assignment in the same community. If platform policy permits admin
     *   oversight, admins may also be accepted. Reject all other actors. 4.
     *   Load the target community_platform_community_moderators row by id using
     *   moderatorId and reject when not found. 5. Validate that the moderator
     *   assignment belongs to the specified community by checking
     *   community_platform_community_id === communityId. Reject mismatched
     *   parent-child combinations. 6. Parse the request body as
     *   ICommunityPlatformCommunityModeratorSnapshot.IRequest. Support
     *   pagination inputs, optional createdAt range filters, and sort
     *   directives. If no sort is provided, default to created_at descending.
     *   7. Query community_platform_community_moderator_snapshots where
     *   community_platform_community_moderator_id equals moderatorId. Apply
     *   validated created_at filters if present. 8. Return paginated results as
     *   IPageICommunityPlatformCommunityModeratorSnapshot.ISummary. Each row
     *   should at minimum include snapshot identity and created-at information
     *   required for list display. 9. Ensure pagination metadata is computed
     *   from the filtered dataset. 10. Error handling: reject when the
     *   community is missing, the moderator assignment is missing, the
     *   assignment is outside the specified community, or the actor lacks
     *   community-scoped moderation authority. Do not expose snapshot rows from
     *   other communities or moderator assignments.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityModeratorSnapshot.IRequest,
  ): Promise<IPageICommunityPlatformCommunityModeratorSnapshot.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(
        {
          member,
          communityId,
          moderatorId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single historical snapshot record for a moderator assignment within a specific community.
   *
   * This operation returns one point-in-time snapshot entry from the community moderator history maintained for governance and audit retrieval. The underlying snapshot table, community_platform_community_moderator_snapshots, is described as append-only historical records for community moderator assignment snapshot events. Each snapshot row belongs to exactly one moderator assignment through community_platform_community_moderator_id and records the time the snapshot entry was created. The parent moderator assignment in community_platform_community_moderators stores the community reference, the assigned member, the granting member, the revoking member when applicable, the current role classification, lifecycle status, grant and revocation timestamps, and revocation reason. Together, these records allow clients to inspect the historical trail of community-scoped moderator governance.
   *
   * Access to this operation must be restricted to governance-aware actors for the target community. The requirements state that moderators may view reports only for their own community and may view banned users only for their own community, and moderator management actions are governed by community role rules. Those same community-scoped authority boundaries apply here because moderator snapshot history concerns privileged governance data rather than publicly viewable community content. The owner remains the highest authority within community moderation, the creator of the community is the owner, and both owners and moderators may add moderators within the same community. Accordingly, the endpoint should only expose snapshot history to the community owner, active moderators of the same community, and platform administrators when administrative oversight is required by the service.
   *
   * The nested route is significant to the resource meaning. The community_platform_community_moderators table is the canonical governance record for local moderator authority, and the snapshot table depends on that parent assignment rather than duplicating assignment details. For that reason, the implementation must confirm that the moderator assignment identified by {moderatorId} belongs to the community identified by {communityId}, and then confirm that the snapshot identified by {snapshotId} belongs to that moderator assignment. If any relationship does not match, the request must be rejected as not found or forbidden according to the service's error policy, rather than leaking whether unrelated governance records exist.
   *
   * This endpoint is typically used together with community moderation management and history browsing features. A client would usually first obtain community context and the relevant moderator assignment from community governance screens, then request this endpoint to inspect a specific snapshot event in detail. The response should present the snapshot resource in a form suitable for audit-oriented interfaces while preserving the normalized meaning of the underlying schema comments: the snapshot itself marks when the history row was recorded, while the associated moderator assignment provides the moderated community, assigned member, granting identity, revocation identity, role, and lifecycle status needed to understand the event.
   *
   * Expected behavior is straightforward but strict. On success, the operation returns the requested moderator snapshot detail in JSON. The service must reject access when the caller lacks governance authority for the target community, when the community does not exist, when the moderator assignment does not exist in that community, or when the snapshot does not belong to that moderator assignment. The operation is read-only and must not alter snapshot, moderator, community, or member state.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param moderatorId Target moderator assignment's ID within the community
   * @param snapshotId Target moderator snapshot's ID for the moderator assignment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a read-only detail retrieval for one
     *   community moderator snapshot.
   *
   * 1. Authorize the caller before data access. Allow access only to a platform admin or to a member who has governance authority in the target community. Governance authority means either: (a) the member is the owner of the target community, represented by an active community_platform_community_moderators row for the same community with a related community_platform_community_moderator_owners subtype row; or (b) the member is an active moderator of the same community. Reject guests and ordinary members without community governance standing.
   *
   * 2. Validate hierarchical ownership of the nested identifiers. Query community_platform_communities by id = communityId and ensure the record is not logically removed in a way that should hide governance history according to service policy. Query community_platform_community_moderators by id = moderatorId and community_platform_community_id = communityId. Then query community_platform_community_moderator_snapshots by id = snapshotId and community_platform_community_moderator_id = moderatorId. Do not load the snapshot independently first and then trust client-supplied parent IDs; always enforce the full parent-child chain in the database query or in equivalent guarded validation steps.
   *
   * 3. Build the response DTO from the snapshot and its related assignment context. The snapshot row itself provides id, community_platform_community_moderator_id, and created_at. Join the parent community_platform_community_moderators row to expose the governed community, assigned member, granted-by member, revoked-by member if present, role, status, granted_at, revoked_at, revocation_reason, created_at, updated_at, and deleted_at as needed by the generated DTO contract. Join owner subtype presence from community_platform_community_moderator_owners if the DTO includes a derived owner indicator. Join related member identities only as allowed by the DTO schema and privacy rules.
   *
   * 4. Enforce business invariants from the requirements. Treat the community owner as the highest moderation authority within the community. Preserve community scope: a moderator assignment or snapshot from another community must never be readable through this route. If the actor is a moderator, do not grant broader cross-community visibility. If the assignment has been revoked or logically deleted, still allow historical retrieval only when policy permits audit visibility; otherwise reject consistently. Never mutate snapshot or assignment state during read.
   *
   * 5. Error handling. Return not found when the community, moderator assignment, or snapshot cannot be resolved within the required hierarchy. Return forbidden when the caller is authenticated but lacks governance authority for the target community. Return unauthorized for unauthenticated callers where authentication is required. Avoid distinguishable error details that reveal the existence of governance records in other communities.
   *
   * 6. Performance and consistency. Prefer a single query plan or tightly bounded transactional read that filters by snapshot id, moderator id, and community id together and joins the parent assignment and necessary member/community relations. Ensure deterministic response mapping and omit unrelated child collections to keep the detail view focused on the requested snapshot event.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityModeratorSnapshot> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshotsSnapshotId(
        {
          member,
          communityId,
          moderatorId,
          snapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

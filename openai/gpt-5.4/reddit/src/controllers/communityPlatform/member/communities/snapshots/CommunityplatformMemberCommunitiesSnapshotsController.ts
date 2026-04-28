import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunitySnapshot } from "../../../../../api/structures/ICommunityPlatformCommunitySnapshot";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postCommunityPlatformMemberCommunitiesCommunitySlugSnapshots } from "../../../../../providers/postCommunityPlatformMemberCommunitiesCommunitySlugSnapshots";

@Controller("/communityPlatform/member/communities/:communitySlug/snapshots")
export class CommunityplatformMemberCommunitiesSnapshotsController {
  /**
   * Create a new historical snapshot record for a specific community identified by its slug.
   *
   * This operation creates an append-only record in the community snapshot history for the target community. The parent community is resolved from `community_platform_communities.slug`, which the database schema defines as the platform-wide unique community identifier used in readable URLs and lookup operations. The created snapshot is stored in `community_platform_community_snapshots`, a table described as a point-in-time historical snapshot record associated with a community. In line with that schema design, the snapshot captures child-specific historical attributes such as the snapshot `visibility` classification and timestamp, while parent-owned community data remains available through the parent community relationship rather than being copied into the snapshot payload.
   *
   * Access to this operation should be limited to authenticated members with authority to manage the target community. Because `community_platform_communities` stores the owner member reference as `community_platform_member_id`, the implementation should verify that the caller is permitted to create historical records for that community before inserting a new snapshot. This is not a public browsing endpoint for guests. It is a management and audit-support endpoint intended for controlled use when the service needs to preserve a historical community state boundary.
   *
   * The operation depends on the target community already existing and being resolvable by the supplied slug. If no community matches the slug, the request must be rejected. If the caller is not authorized to manage that community, the request must also be rejected. The implementation should create a new snapshot row linked to the parent community through `community_platform_community_id`, set the snapshot creation timestamp, and return the resulting snapshot resource. Because the snapshot model is historical and append-only, this endpoint creates a new record rather than modifying an existing one.
   *
   * This endpoint is related to direct community retrieval and management operations. A caller typically identifies the target community first through community browsing or community detail retrieval, then uses this endpoint to persist a historical checkpoint for that community. The resulting snapshot can later support audit inspection, sequence tracking, and historical review scenarios built on top of the snapshot table.
   *
   * @param connection
   * @param communitySlug Target community slug (global scope)
   * @param body Snapshot creation data for the target community
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Resolve the target community by querying
     *   `community_platform_communities` with `slug = :communitySlug` and
     *   ensure the record is eligible for management access. Reject the request
     *   if the community does not exist or if it has been removed from active
     *   use in a way that forbids new snapshot creation according to service
     *   policy.
   *
   * Authorize the caller as an authenticated member with management rights over the target community. At minimum, compare the authenticated member identifier against `community_platform_communities.community_platform_member_id`. If the service later allows delegated moderators or other management roles to create historical records, apply that authorization rule before continuing.
   *
   * Validate the request body against the snapshot creation DTO. Accept only snapshot-scoped fields that belong to `community_platform_community_snapshots`; do not accept or persist parent community fields such as slug, title, description, status, or owner reference through this endpoint. Ensure the `visibility` value is present and valid according to the domain enumeration used by the service.
   *
   * Create a new `community_platform_community_snapshots` row with a newly generated UUID `id`, the resolved parent `community_platform_community_id`, the provided `visibility`, and the current timestamp in `created_at`. Set `deleted_at` to null for a newly created snapshot. Persist the insert in a transactionally safe manner.
   *
   * Return the created snapshot resource after insertion. Include the generated identifier, parent linkage, visibility classification, creation timestamp, and current deletion state. Handle error conditions explicitly: unknown community slug results in not-found behavior, unauthorized caller results in forbidden behavior, invalid payload results in validation failure, and database uniqueness or integrity failures should be surfaced as a safe server-side error response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communitySlug")
    communitySlug: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunitySnapshot.ICreate,
  ): Promise<ICommunityPlatformCommunitySnapshot> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunitySlugSnapshots(
        {
          member,
          communitySlug,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

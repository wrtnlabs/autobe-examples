import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityBan } from "../../../../../api/structures/ICommunityPlatformCommunityBan";
import { IPageICommunityPlatformCommunityBan } from "../../../../../api/structures/IPageICommunityPlatformCommunityBan";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberCommunitiesCommunityNameBansBanId } from "../../../../../providers/deleteCommunityPlatformMemberCommunitiesCommunityNameBansBanId";
import { getCommunityPlatformMemberCommunitiesCommunityNameBansBanId } from "../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityNameBansBanId";
import { patchCommunityPlatformMemberCommunitiesCommunityNameBans } from "../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityNameBans";
import { postCommunityPlatformMemberCommunitiesCommunityNameBans } from "../../../../../providers/postCommunityPlatformMemberCommunitiesCommunityNameBans";

@Controller("/communityPlatform/member/communities/:communityName/bans")
export class CommunityplatformMemberCommunitiesBansController {
  /**
   * Create a new ban record to restrict a user's participation in a specific community.
   *
   * This operation allows community moderators and owners to ban users from participating in their community. When a user is banned, they can no longer create posts or comments within that community, but they retain read access to view existing content. The ban is specific to the target community and does not affect the user's standing in any other community on the platform.
   *
   * The ban record captures essential audit information including who applied the ban, when it was applied, and an optional reason for transparency. This information supports moderation accountability and can be referenced if the ban decision is later questioned.
   *
   * Authorization requires the requester to be either the community owner or an active moderator. The community owner has immunity from bans and cannot be banned by anyone. Moderators cannot ban other moderators; only the community owner can ban moderators. Attempting to ban an already-banned user will result in a conflict error.
   *
   * Related operations:
   * - GET /communities/{communityName}/bans - List all active bans for the community
   * - DELETE /communities/{communityName}/bans/{banId} - Remove a ban (unban user)
   *
   * @param connection
   * @param communityName Unique name identifier of the community where the ban will be applied (global scope)
   * @param body Ban creation information including the user to ban and optional reason for the ban
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication Check**: Verify the requester is an authenticated member.
   *
   * 2. **Community Lookup**: Query community_platform_communities by name (path parameter) to get community_id and owner_id. Return 404 if not found.
   *
   * 3. **Authorization Check**: Verify requester is either:
   *    - The community owner (owner_id matches requester's member ID), OR
   *    - An active moderator (query community_platform_community_moderators where community_id matches AND member_id matches requester AND deleted_at IS NULL)
   *    Return 403 if neither condition is met.
   *
   * 4. **Input Validation**:
   *    - Validate bannedUserId is a valid UUID format
   *    - Validate reason (if provided) is within character limits
   *
   * 5. **Owner Immunity Check**: If bannedUserId equals the community's owner_id, return 403 with error indicating owners cannot be banned.
   *
   * 6. **Moderator Hierarchy Check**: If the requester is a moderator (not owner), verify the target user is not also a moderator. Query community_platform_community_moderators for active moderator status of the target user in this community. Moderators cannot ban other moderators; only the owner can.
   *
   * 7. **Duplicate Ban Check**: Query community_platform_community_bans where community_id matches AND banned_user_id matches AND deleted_at IS NULL. If record exists, return 409 Conflict indicating user is already banned.
   *
   * 8. **User Existence Check**: Verify the target user exists in community_platform_members (not soft-deleted). Return 404 if user not found.
   *
   * 9. **Create Ban Record**: Insert into community_platform_community_bans with:
   *    - community_id from step 2
   *    - banned_user_id from request body
   *    - banned_by_id = requester's member ID
   *    - reason from request body (or null)
   *    - created_at = current timestamp
   *    - updated_at = current timestamp
   *    - deleted_at = null
   *
   * 10. **Return Response**: Return the created ban record with all fields including the generated id and timestamps.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: ICommunityPlatformCommunityBan.ICreate,
  ): Promise<ICommunityPlatformCommunityBan> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunityNameBans({
        member,
        communityName,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of users banned from a specific community.
   *
   * This operation allows community moderators and owners to view the complete list of banned users within their community. Each ban record includes the banned user's information, the moderator who applied the ban, the optional reason for the ban, and timestamps for when the ban was applied and optionally removed.
   *
   * The list supports filtering by banned user's username, ban reason text, date range, and whether to include users who have been unbanned. Results are paginated and sorted by ban date in descending order by default.
   *
   * Access to this endpoint is restricted to community moderators and owners. Guests and regular members cannot view the ban list. The community is identified by its unique name in the path parameter.
   *
   * This endpoint provides transparency for moderation actions and helps community leadership track enforcement history. Bans are community-specific and do not affect the user's standing in other communities.
   *
   * @param connection
   * @param communityName Unique name of the community (global scope)
   * @param body Search criteria and pagination parameters for ban list
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query community_platform_community_bans table with community filtered by community name from path parameter. Join with community_platform_members for banned_user and banned_by relations to retrieve display names and usernames.
   *
   * Filter criteria:
   * - Filter by banned user's username (partial match, case-insensitive)
   * - Filter by reason text (partial match)
   * - Filter by date range (created_at between from/to)
   * - Filter by status: active (deleted_at is null) or all (include unbanned)
   *
   * Apply pagination with cursor-based approach for efficient scrolling.
   * Sort by created_at descending by default.
   *
   * Authorization check: Verify requesting member is a moderator or owner of the community before returning results.
   *
   * Response includes ban details: id, reason, created_at, deleted_at (if unbanned), plus nested banned user summary (id, username, display_name) and moderator summary (id, username, display_name).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: ICommunityPlatformCommunityBan.IRequest,
  ): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityNameBans({
        member,
        communityName,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific ban record within a community.
   *
   * This endpoint allows community moderators and owners to view complete ban details, including who was banned, when the ban was applied, which moderator enacted the ban, and the optional reason for the ban. The response provides full context for reviewing and managing community moderation actions.
   *
   * The ban record captures community-specific enforcement where users are restricted from posting and commenting within that community while retaining read access. Each ban is scoped to a single community, allowing users to participate normally in other communities where they are not banned.
   *
   * Bans maintain a complete audit trail of moderation actions. Even after a ban is removed (unbanned), the historical record is preserved with the deleted_at timestamp marking when the user's participation rights were restored. This transparency supports moderator accountability and enables review of past moderation decisions.
   *
   * Authorization requires the authenticated user to be either the community owner or an active moderator. Regular members and users from other communities cannot access ban details. The operation returns the full ban information including related user profiles for both the banned member and the moderator who applied the ban.
   *
   * @param connection
   * @param communityName Unique name identifier of the community (case-insensitive match). The community from which to retrieve ban details.
   * @param banId Unique identifier (UUID) of the ban record to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation Requirements:
   *
   * 1. Authorization Verification:
   *    - Verify authenticated user is a member
   *    - Verify user is either the community owner OR a moderator of the community
   *    - Return 403 Forbidden if authorization fails
   *
   * 2. Path Parameter Resolution:
   *    - Resolve communityId from communityName using case-insensitive lookup on community_platform_communities.name
   *    - Return 404 Not Found if community does not exist
   *    - Resolve ban record using banId parameter
   *    - Return 404 Not Found if ban record does not exist or does not belong to the specified community
   *
   * 3. Ban Record Retrieval:
   *    - Query community_platform_community_bans by id where community_id matches resolved communityId
   *    - Include soft-deleted (unbanned) records - deleted_at is not a filter criterion
   *    - Join with community_platform_members to get banned user details (id, username, display_name)
   *    - Join with community_platform_members again to get banning moderator details (id, username, display_name)
   *    - Join with community_platform_communities to include community context
   *
   * 4. Response Construction:
   *    - Return full ban details including nested user and moderator information
   *    - Include created_at timestamp (ban enactment time)
   *    - Include deleted_at if present (unban time - null for active bans)
   *    - Include optional reason field
   *
   * 5. Error Handling:
   *    - 401 Unauthorized for unauthenticated requests
   *    - 403 Forbidden for non-moderator/non-owner members
   *    - 404 Not Found for non-existent community or ban
   *    - 400 Bad Request for malformed UUID or invalid parameters
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":banId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityBan> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityNameBansBanId({
        member,
        communityName,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a ban from a community, restoring the banned user's ability to create posts and comments.
   *
   * This operation allows moderators and community owners to reverse a ban that was previously applied to a user. Once the ban is removed, the user regains full participation rights within the community, including the ability to create new posts and write comments.
   *
   * The operation requires moderator or owner privileges. Any moderator can remove bans applied by other moderators, and the community owner can remove any ban. This ensures flexibility in moderation while maintaining accountability.
   *
   * The ban record is not permanently deleted but soft-deleted, preserving an audit trail of all ban and unban actions for moderation accountability. The deleted_at timestamp marks when the ban was lifted, and the historical record remains accessible for reference.
   *
   * Note that removing a ban does not automatically restore the user's subscription to the community. If the user was previously subscribed and their subscription was affected, they would need to re-subscribe through the normal subscription process.
   *
   * Security: Requires member authentication. User must be an active moderator or the community owner. The community is identified by its unique name, and the specific ban is identified by its UUID.
   *
   * @param connection
   * @param communityName Unique name of the community where the ban exists (global scope)
   * @param banId UUID of the ban record to remove
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. Authenticate the requesting user (must be a member)
   *
   * 2. Resolve community by name from path parameter:
   *    - Query community_platform_communities WHERE name = communityName AND deleted_at IS NULL
   *    - Return 404 if community not found
   *
   * 3. Verify authorization:
   *    - Check if user is community owner (community.owner_id == current_member.id)
   *    - OR check if user is an active moderator (EXISTS in community_platform_community_moderators WHERE community_id = community.id AND member_id = current_member.id AND deleted_at IS NULL)
   *    - Return 403 if neither condition is met
   *
   * 4. Resolve ban record:
   *    - Query community_platform_community_bans WHERE id = banId AND community_id = community.id AND deleted_at IS NULL
   *    - Return 404 if ban not found or already removed
   *
   * 5. Perform soft-delete:
   *    - UPDATE community_platform_community_bans SET deleted_at = NOW(), updated_at = NOW() WHERE id = banId
   *
   * 6. Return the updated ban record with deleted_at timestamp
   *
   * Edge cases:
   * - Ban not found or already unbanned: 404 error
   * - User not authorized: 403 error
   * - Community not found: 404 error
   * - Owner cannot be banned (per schema constraints), but this operation handles removal of existing bans
   *
   * The soft-delete preserves audit trail while restoring user's participation rights immediately.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":banId")
  public async unban(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberCommunitiesCommunityNameBansBanId(
        {
          member,
          communityName,
          banId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

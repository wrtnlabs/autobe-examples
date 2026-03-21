import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIRedditCloneUserKarma } from "../../../../../api/structures/IPageIRedditCloneUserKarma";
import { IRedditCloneUserKarma } from "../../../../../api/structures/IRedditCloneUserKarma";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteRedditCloneMemberCommunitiesCommunityNameBansBanId } from "../../../../../providers/deleteRedditCloneMemberCommunitiesCommunityNameBansBanId";
import { getRedditCloneMemberCommunitiesCommunityNameBansBanId } from "../../../../../providers/getRedditCloneMemberCommunitiesCommunityNameBansBanId";
import { patchRedditCloneMemberCommunitiesCommunityNameBans } from "../../../../../providers/patchRedditCloneMemberCommunitiesCommunityNameBans";
import { postRedditCloneMemberCommunitiesCommunityNameBans } from "../../../../../providers/postRedditCloneMemberCommunitiesCommunityNameBans";
import { putRedditCloneMemberCommunitiesCommunityNameBansBanId } from "../../../../../providers/putRedditCloneMemberCommunitiesCommunityNameBansBanId";

@Controller("/redditClone/member/communities/:communityName/bans")
export class RedditcloneMemberCommunitiesBansController {
  /**
   * Ban a user from a community, permanently recording the restriction in the database.
   *
   * This endpoint allows community moderators and owners to restrict users who violate community rules or guidelines. The ban creates an audit trail by recording the moderator who issued it and the reason provided.
   *
   * When a ban is created, the system enforces the following behaviors for the banned user within that community:
   * - The user CANNOT create new posts or comments
   * - The user CAN view existing posts and comments
   * - The user CAN vote on posts and comments
   * - The user CANNOT subscribe to the community
   *
   * The ban record includes a reason field for accountability and an optional expires_at field for temporary bans. Permanent bans leave expires_at as null. The banned_user_id and issued_by_reddit_clone_user_id establish the relationship between the affected user and the moderator who enforced the ban.
   *
   * Authorization requires the requesting user to be either the community owner or a moderator with the 'moderator' or 'owner' role in the reddit_clone_moderators table. The community is identified by its unique name in the path parameter, and the target user is identified by their username in the request body.
   *
   * The response returns the complete ban record including the generated UUID, timestamps, community reference, banned user reference, and the issuer reference for verification.
   *
   * **Important restrictions**: The community owner cannot be banned from their own community. Moderators cannot ban other moderators from the same community.
   *
   * @param connection
   * @param communityName Unique name of the community (URL-safe identifier)
   * @param body Username of the user to ban and the reason for the ban
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation for ban creation operation:
   *
   * 1. PATH PARAMETER EXTRACTION:
   *    - Extract communityName from path parameter
   *    - Query reddit_clone_communities table to get id by name WHERE name = communityName
   *    - Return 404 if community not found
   *
   * 2. AUTHENTICATION VERIFICATION:
   *    - Verify member is authenticated via session
   *    - Extract authenticated member ID from session token
   *
   * 3. MODERATOR AUTHORIZATION CHECK:
   *    - Query reddit_clone_moderators table to verify the authenticated member has either:
   *      - role = 'owner' OR role = 'moderator' in the target community
   *      - WHERE reddit_clone_community_id = community.id AND reddit_clone_member_id = authenticatedMemberId AND deleted_at IS NULL
   *    - Return 403 if not authorized
   *
   * 4. TARGET USER VALIDATION:
   *    - Extract bannedUsername from request body
   *    - Query reddit_clone_members table to get user ID WHERE username = bannedUsername AND deleted_at IS NULL
   *    - Return 404 if target user not found
   *
   * 5. BAN ELIGIBILITY CHECK:
   *    - Query reddit_clone_bans table to check existing active ban:
   *      - WHERE reddit_clone_community_id = community.id AND reddit_clone_user_id = targetUser.id AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
   *    - Return 409 Conflict if user is already banned
   *
   * 6. BAN CREATION:
   *    - Generate UUID for new ban record
   *    - Set created_at and updated_at to current timestamp
   *    - Leave deleted_at as NULL (ban is active)
   *    - Set expires_at from request body if provided, otherwise NULL
   *    - INSERT INTO reddit_clone_bans:
   *      - id, reddit_clone_community_id, reddit_clone_user_id, issued_by_reddit_clone_user_id, reason, created_at, updated_at, deleted_at, expires_at
   *
   * 7. RESPONSE:
   *    - Return the complete ban record with all fields populated
   *    - Include nested community object (without children arrays)
   *    - Include nested bannedUser object (without sensitive fields like password_hash)
   *    - Include nested issuer object (without sensitive fields)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: IRedditCloneUserKarma.ICreate,
  ): Promise<IRedditCloneUserKarma> {
    try {
      return await postRedditCloneMemberCommunitiesCommunityNameBans({
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
   * Retrieve a paginated and filterable list of banned users within a specific community.
   *
   * This endpoint provides moderators and community owners with comprehensive access to the ban management view. It allows searching through the ban records using various filters such as banned user username, ban issuance date ranges, ban expiration status, and the moderator who issued the ban.
   *
   * The operation returns active bans by default, excluding unbanned users (those with deleted_at set). Each ban record includes the banned user's information, the reason for the ban, when it was issued, and optionally when it expires (for temporary bans).
   *
   * Access is restricted to authenticated moderators and community owners only. Regular members and guests receive a 403 Forbidden response. The endpoint requires the community to exist and the authenticated user to have moderation privileges within that community.
   *
   * The response is paginated with configurable page size and sorting options by ban creation date.
   *
   * @param connection
   * @param communityName Unique name of the community (URL-safe identifier)
   * @param body Search criteria and pagination parameters for filtering banned users
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the reddit_clone_bans table with JOINs to reddit_clone_communities and reddit_clone_members tables to resolve user information.
   *
   * 1. Validate community existence by communityName (unique constraint on name field)
   * 2. Verify the authenticated user is a moderator or owner of the community (check reddit_clone_community_moderators table)
   * 3. Apply filters from request body:
   *    - Filter by banned username (partial match)
   *    - Filter by ban issuance date range (created_at between startDate and endDate)
   *    - Filter by expiration status (active only, expired only, or all)
   *    - Filter by issuing moderator username
   * 4. Exclude unbanned records (WHERE deleted_at IS NULL for active bans)
   * 5. Apply pagination with page number and limit
   * 6. Order by ban creation date descending (newest first)
   * 7. Return summary data including user info, reason, timestamps, and expiration
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: IRedditCloneUserKarma.IRequest,
  ): Promise<IPageIRedditCloneUserKarma.ISummary> {
    try {
      return await patchRedditCloneMemberCommunitiesCommunityNameBans({
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
   * Retrieve details of a specific user ban within a community.
   *
   * This endpoint returns the complete ban record including the banned user information, issuing moderator, ban reason, timestamps, and expiration status. The ban is scoped to the specified community, ensuring users banned from one community retain access to others.
   *
   * The response includes the issuer's information for accountability purposes, as moderators must be identifiable for their enforcement actions. Temporary bans include expiration timestamps, while permanent bans have null expiration.
   *
   * Authorization: Only community moderators and the community owner can access this endpoint. Regular members and guests receive a 403 Forbidden response.
   *
   * This operation is typically used in conjunction with the ban listing endpoint to view detailed information about a specific enforcement action.
   *
   * @param connection
   * @param communityName Unique name identifier of the community (from reddit_clone_communities.name)
   * @param banId UUID of the ban record to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the reddit_clone_bans table using the banId parameter as the primary identifier.
   *
   * Join with reddit_clone_communities to verify the community exists and match by communityName.
   *
   * Join with reddit_clone_members twice: once to fetch banned user details (bannedUser relation), once to fetch issuer details (issuer relation).
   *
   * Verify the requesting user is either:
   * - The community owner (reddit_clone_communities.reddit_clone_member_id)
   * - A moderator in the community (reddit_clone_community_moderators)
   *
   * Return the complete ban record with related user and issuer information.
   *
   * If ban has been soft-deleted (deleted_at IS NOT NULL), return 404 Not Found.
   *
   * If ban belongs to a different community, return 404 Not Found.
   *
   * If requester lacks authorization, return 403 Forbidden.
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
  ): Promise<IRedditCloneUserKarma> {
    try {
      return await getRedditCloneMemberCommunitiesCommunityNameBansBanId({
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
   * Update an existing ban within a community to modify its reason or expiration time.
   *
   * This endpoint allows community moderators and owners to update the details of an existing ban. Moderators can change the reason for the ban to provide better documentation, or modify the expiration timestamp for temporary bans.
   *
   * The operation requires authentication. Only moderators of the specified community or the community owner can update a ban. The banned user cannot be changed - to ban a different user, a new ban must be created. Banned users retain read access to community content but cannot create new posts or comments.
   *
   * The ban record in the database tracks the original issuing moderator (issued_by_reddit_clone_user_id), which is preserved during updates. Only the reason and expiration time can be modified.
   *
   * If the ban has already been lifted (deleted_at is set), this operation returns a 404 error. To re-ban a previously unbanned user, a new ban must be created.
   *
   * Related operations:
   * - POST /communities/{communityName}/bans - Create a new ban
   * - DELETE /communities/{communityName}/bans/{banId} - Lift a ban
   * - GET /communities/{communityName}/bans - List all bans for the community
   *
   * @param connection
   * @param communityName Unique name identifier of the community (e.g., 'askreddit', 'funny')
   * @param banId Unique identifier of the ban record to update
   * @param body Fields to update in the ban record
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query reddit_clone_communities to find the community by name. Verify the requesting user is authenticated and is a moderator of the community or the community owner.
   *
   * Query reddit_clone_bans to find the ban by id where reddit_clone_community_id matches the community and deleted_at is null.
   *
   * If ban not found or community not found, return 404 error.
   *
   * Validate request body fields:
   * - reason: optional string, max 500 characters
   * - expires_at: optional timestamp, must be in the future if provided
   *
   * Update only the provided fields in the ban record. Set updated_at to current timestamp.
   *
   * Return the updated ban record with community, banned user, and issuer details joined.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":banId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditCloneUserKarma.IUpdate,
  ): Promise<IRedditCloneUserKarma> {
    try {
      return await putRedditCloneMemberCommunitiesCommunityNameBansBanId({
        member,
        communityName,
        banId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a ban from a user within a community, allowing them to participate again.
   *
   * This endpoint lifts an active ban within a specific community. When executed, the ban record's deleted_at field is set to the current timestamp, effectively unbanning the user without removing the ban record from the database. This soft deletion approach preserves the audit history of all ban actions taken by moderators.
   *
   * Only users with moderation privileges in the community can unban other users. This includes community moderators appointed by the owner and the community owner themselves. The system verifies the requesting user's authorization before allowing the unban action.
   *
   * Banned users who are unbanned regain full access to create posts and comments within the community. Their existing posts and comments that were created before the ban remain visible and are not affected by the unban action.
   *
   * The reddit_clone_bans table stores ban records with fields for reddit_clone_community_id, reddit_clone_user_id, issued_by_reddit_clone_user_id, reason, created_at, updated_at, deleted_at, and expires_at. The soft deletion via deleted_at preserves all audit information while allowing the user to participate again.
   *
   * @param connection
   * @param communityName Unique name identifier of the community (e.g., 'askreddit', 'funny')
   * @param banId Unique identifier of the ban record to remove
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement the unban operation for the reddit_clone_bans table:
   *
   * 1. **Parameter Extraction**: Extract communityName from path parameters to identify the target community, and banId to identify the specific ban record.
   *
   * 2. **Authorization Verification**:
   *    - Retrieve the community using the communityName from reddit_clone_communities
   *    - Verify the requesting user is authenticated (member session)
   *    - Check if the requesting user has moderation privileges in the community by querying reddit_clone_moderators
   *    - Verify either: (a) the user has a 'moderator' role in reddit_clone_moderators for this community, or (b) the user has the 'owner' role
   *    - If authorization fails, return 403 Forbidden
   *
   * 3. **Ban Existence Check**:
   *    - Query reddit_clone_bans where id equals banId
   *    - Verify the ban belongs to the specified community
   *    - Verify the ban's deleted_at is NULL (active ban)
   *    - If no active ban found, return 404 Not Found
   *
   * 4. **Soft Delete Execution**:
   *    - Set deleted_at field to current timestamp (UTC)
   *    - Update updated_at field to current timestamp
   *    - Execute UPDATE query on reddit_clone_bans table
   *
   * 5. **Response**: Return 204 No Content on success with no response body.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":banId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteRedditCloneMemberCommunitiesCommunityNameBansBanId({
        member,
        communityName,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

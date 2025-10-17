import { Controller } from "@nestjs/common";
import { TypedRoute, TypedParam, TypedBody } from "@nestia/core";
import typia, { tags } from "typia";
import { putDiscussionBoardMemberUsersUserId } from "../../../../providers/putDiscussionBoardMemberUsersUserId";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";

import { IDiscussionBoardMember } from "../../../../api/structures/IDiscussionBoardMember";

@Controller("/discussionBoard/member/users/:userId")
export class DiscussionboardMemberUsersController {
  /**
   * Update an existing discussion board member's profile information.
   *
   * Update profile information for an existing discussion board member account.
   * This operation allows authenticated members to modify their own profile
   * details including display name, biographical information, avatar URL,
   * location, website, visibility preferences, and localization settings.
   * Administrators can update any member's profile for account management
   * purposes.
   *
   * The operation validates all profile updates according to comprehensive
   * business rules defined in the requirements documentation. Display names
   * must be between 1 and 50 characters and support Unicode for international
   * users. Biographical information is limited to 500 characters and undergoes
   * profanity filtering. Avatar URLs must be valid HTTP/HTTPS URLs with maximum
   * length of 80,000 characters (VARCHAR limit in schema) and are validated for
   * security. Location and website fields are optional and subject to length
   * constraints (100 characters for location, 200 characters maximum for
   * website URL).
   *
   * Profile visibility settings control how other users can view the member's
   * profile and activity. The profile_visibility field supports three levels:
   * public (visible to all including guests), members_only (visible only to
   * authenticated users), and private (hidden from search and direct access).
   * The activity_visibility field independently controls whether the member's
   * discussion topics and replies are displayed on their profile page with the
   * same three visibility levels. Privacy hierarchy is enforced - if profile
   * visibility is private, activity visibility is automatically private as
   * well.
   *
   * Timezone and language preferences affect how the platform displays
   * timestamps and interface elements to the user. Timezone must be a valid
   * IANA timezone identifier (e.g., 'America/New_York', 'Europe/London') and
   * defaults to auto-detection from browser if not specified. Language must be
   * an ISO 639-1 language code (e.g., 'en', 'es', 'de') with English as the
   * default.
   *
   * Rate limiting is strictly enforced to prevent profile update abuse. Members
   * are limited to 5 profile updates per hour as defined in business rules,
   * with exceeded limits resulting in temporary restrictions and clear error
   * messaging indicating the cooldown period. Profile picture changes are
   * separately limited to 3 changes per day. These limits do not apply to
   * administrators performing account management tasks.
   *
   * Certain critical fields are intentionally excluded from this update
   * operation due to security implications. Username cannot be changed after
   * account creation to maintain discussion attribution integrity and prevent
   * identity confusion. Email addresses require a separate verification
   * workflow involving email confirmation to both old and new addresses to
   * prevent account hijacking. Password changes go through a dedicated secure
   * password update endpoint requiring current password verification for
   * security. Account status and role assignments are restricted to
   * administrator-only operations for security and privilege management.
   *
   * The operation validates that the requesting user has permission to modify
   * the specified member profile. Members can only update their own profiles
   * (userId in path must match authenticated user's ID) unless they have
   * administrator privileges. The system enforces this through JWT token
   * validation and role-based access control, returning 403 Forbidden if a
   * member attempts to modify another user's profile without appropriate
   * authorization.
   *
   * Upon successful profile update, the system records the modification
   * timestamp in the updated_at field, logs the profile change in
   * discussion_board_audit_logs for audit purposes, and immediately reflects
   * the changes across all user interface elements displaying the member's
   * information. If the member has active sessions on multiple devices, profile
   * changes propagate in real-time through WebSocket notifications or upon next
   * page refresh, ensuring consistent profile display across all platforms.
   *
   * @param connection
   * @param userId Unique identifier of the target member whose profile is being
   *   updated
   * @param body Updated profile information including display name, bio, avatar
   *   URL, location, website, visibility preferences, timezone, and language
   *   settings (excludes username, email, password, and account status which
   *   require separate operations)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("userId")
    userId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardMember.IUpdate,
  ): Promise<IDiscussionBoardMember> {
    try {
      return await putDiscussionBoardMemberUsersUserId({
        member,
        userId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationSuspensionsSuspensionId(props: {
  moderator: ModeratorPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserSuspension> {
  const { moderator, suspensionId } = props;

  const suspension =
    await MyGlobal.prisma.discussion_board_user_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
      include: {
        suspendedUser: true,
        suspendingModerator: true,
        liftingModerator: true,
      },
    });

  return {
    id: suspension.id as string & tags.Format<"uuid">,
    discussion_board_member_id:
      suspension.discussion_board_member_id as string & tags.Format<"uuid">,
    suspending_moderator_id: suspension.suspending_moderator_id as string &
      tags.Format<"uuid">,
    lifted_by_moderator_id: suspension.lifted_by_moderator_id
      ? (suspension.lifted_by_moderator_id as string & tags.Format<"uuid">)
      : null,
    related_moderation_action_id: suspension.related_moderation_action_id
      ? (suspension.related_moderation_action_id as string &
          tags.Format<"uuid">)
      : null,
    suspension_reason: suspension.suspension_reason,
    suspension_details: suspension.suspension_details,
    suspended_at: toISOStringSafe(suspension.suspended_at),
    expires_at: suspension.expires_at
      ? toISOStringSafe(suspension.expires_at)
      : null,
    lifted_at: suspension.lifted_at
      ? toISOStringSafe(suspension.lifted_at)
      : null,
    created_at: toISOStringSafe(suspension.created_at),
    updated_at: toISOStringSafe(suspension.updated_at),
    suspendedUser: {
      id: suspension.suspendedUser.id as string & tags.Format<"uuid">,
      username: suspension.suspendedUser.username,
      display_name: suspension.suspendedUser.display_name ?? null,
      profile_picture_url: suspension.suspendedUser.profile_picture_url
        ? (suspension.suspendedUser.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
    },
    suspendingModerator: {
      id: suspension.suspendingModerator.id as string & tags.Format<"uuid">,
      username: suspension.suspendingModerator.username,
      display_name: suspension.suspendingModerator.display_name,
      profile_picture_url: suspension.suspendingModerator.profile_picture_url
        ? (suspension.suspendingModerator.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
      email_verified: suspension.suspendingModerator.email_verified,
      status: suspension.suspendingModerator.status,
      moderation_permissions:
        suspension.suspendingModerator.moderation_permissions,
      profile_visibility: suspension.suspendingModerator.profile_visibility,
      activity_visibility: suspension.suspendingModerator.activity_visibility,
      bio: suspension.suspendingModerator.bio ?? null,
      location: suspension.suspendingModerator.location ?? null,
      website_url: suspension.suspendingModerator.website_url
        ? (suspension.suspendingModerator.website_url as string &
            tags.Format<"uri">)
        : null,
      last_login_at: suspension.suspendingModerator.last_login_at
        ? toISOStringSafe(suspension.suspendingModerator.last_login_at)
        : null,
      created_at: toISOStringSafe(suspension.suspendingModerator.created_at),
      updated_at: toISOStringSafe(suspension.suspendingModerator.updated_at),
      deleted_at: suspension.suspendingModerator.deleted_at
        ? toISOStringSafe(suspension.suspendingModerator.deleted_at)
        : null,
    },
    liftingModerator: suspension.liftingModerator
      ? {
          id: suspension.liftingModerator.id as string & tags.Format<"uuid">,
          username: suspension.liftingModerator.username,
          display_name: suspension.liftingModerator.display_name,
          profile_picture_url: suspension.liftingModerator.profile_picture_url
            ? (suspension.liftingModerator.profile_picture_url as string &
                tags.Format<"uri">)
            : null,
          email_verified: suspension.liftingModerator.email_verified,
          status: suspension.liftingModerator.status,
          moderation_permissions:
            suspension.liftingModerator.moderation_permissions,
          profile_visibility: suspension.liftingModerator.profile_visibility,
          activity_visibility: suspension.liftingModerator.activity_visibility,
          bio: suspension.liftingModerator.bio ?? null,
          location: suspension.liftingModerator.location ?? null,
          website_url: suspension.liftingModerator.website_url
            ? (suspension.liftingModerator.website_url as string &
                tags.Format<"uri">)
            : null,
          last_login_at: suspension.liftingModerator.last_login_at
            ? toISOStringSafe(suspension.liftingModerator.last_login_at)
            : null,
          created_at: toISOStringSafe(suspension.liftingModerator.created_at),
          updated_at: toISOStringSafe(suspension.liftingModerator.updated_at),
          deleted_at: suspension.liftingModerator.deleted_at
            ? toISOStringSafe(suspension.liftingModerator.deleted_at)
            : null,
        }
      : null,
  };
}

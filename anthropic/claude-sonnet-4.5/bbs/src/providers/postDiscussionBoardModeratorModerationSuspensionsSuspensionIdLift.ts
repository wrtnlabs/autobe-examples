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

export async function postDiscussionBoardModeratorModerationSuspensionsSuspensionIdLift(props: {
  moderator: ModeratorPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserSuspension.ILift;
}): Promise<IDiscussionBoardUserSuspension> {
  const { moderator, suspensionId } = props;

  const existingSuspension =
    await MyGlobal.prisma.discussion_board_user_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
    });

  if (existingSuspension.lifted_at !== null) {
    throw new HttpException("Suspension has already been lifted", 400);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_user_suspensions.update({
    where: { id: suspensionId },
    data: {
      lifted_at: now,
      lifted_by_moderator_id: moderator.id,
      updated_at: now,
    },
  });

  const liftedSuspension =
    await MyGlobal.prisma.discussion_board_user_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
      include: {
        suspendedUser: true,
        suspendingModerator: true,
        liftingModerator: true,
      },
    });

  return {
    id: liftedSuspension.id as string & tags.Format<"uuid">,
    discussion_board_member_id:
      liftedSuspension.discussion_board_member_id as string &
        tags.Format<"uuid">,
    suspending_moderator_id:
      liftedSuspension.suspending_moderator_id as string & tags.Format<"uuid">,
    lifted_by_moderator_id: liftedSuspension.lifted_by_moderator_id
      ? (liftedSuspension.lifted_by_moderator_id as string &
          tags.Format<"uuid">)
      : undefined,
    related_moderation_action_id: liftedSuspension.related_moderation_action_id
      ? (liftedSuspension.related_moderation_action_id as string &
          tags.Format<"uuid">)
      : undefined,
    suspension_reason: liftedSuspension.suspension_reason,
    suspension_details: liftedSuspension.suspension_details,
    suspended_at: toISOStringSafe(liftedSuspension.suspended_at),
    expires_at: liftedSuspension.expires_at
      ? toISOStringSafe(liftedSuspension.expires_at)
      : undefined,
    lifted_at: liftedSuspension.lifted_at
      ? toISOStringSafe(liftedSuspension.lifted_at)
      : undefined,
    created_at: toISOStringSafe(liftedSuspension.created_at),
    updated_at: toISOStringSafe(liftedSuspension.updated_at),
    suspendedUser: {
      id: liftedSuspension.suspendedUser.id as string & tags.Format<"uuid">,
      username: liftedSuspension.suspendedUser.username,
      display_name:
        liftedSuspension.suspendedUser.display_name === null
          ? undefined
          : liftedSuspension.suspendedUser.display_name,
      profile_picture_url: liftedSuspension.suspendedUser.profile_picture_url
        ? (liftedSuspension.suspendedUser.profile_picture_url as string &
            tags.Format<"uri">)
        : undefined,
    },
    suspendingModerator: {
      id: liftedSuspension.suspendingModerator.id as string &
        tags.Format<"uuid">,
      username: liftedSuspension.suspendingModerator.username,
      display_name: liftedSuspension.suspendingModerator.display_name,
      profile_picture_url: liftedSuspension.suspendingModerator
        .profile_picture_url
        ? (liftedSuspension.suspendingModerator.profile_picture_url as string &
            tags.Format<"uri">)
        : null,
      email_verified: liftedSuspension.suspendingModerator.email_verified,
      status: liftedSuspension.suspendingModerator.status,
      moderation_permissions:
        liftedSuspension.suspendingModerator.moderation_permissions,
      profile_visibility:
        liftedSuspension.suspendingModerator.profile_visibility,
      activity_visibility:
        liftedSuspension.suspendingModerator.activity_visibility,
      bio:
        liftedSuspension.suspendingModerator.bio === null
          ? undefined
          : liftedSuspension.suspendingModerator.bio,
      location:
        liftedSuspension.suspendingModerator.location === null
          ? undefined
          : liftedSuspension.suspendingModerator.location,
      website_url: liftedSuspension.suspendingModerator.website_url
        ? (liftedSuspension.suspendingModerator.website_url as string &
            tags.Format<"uri">)
        : undefined,
      last_login_at: liftedSuspension.suspendingModerator.last_login_at
        ? toISOStringSafe(liftedSuspension.suspendingModerator.last_login_at)
        : undefined,
      created_at: toISOStringSafe(
        liftedSuspension.suspendingModerator.created_at,
      ),
      updated_at: toISOStringSafe(
        liftedSuspension.suspendingModerator.updated_at,
      ),
      deleted_at: liftedSuspension.suspendingModerator.deleted_at
        ? toISOStringSafe(liftedSuspension.suspendingModerator.deleted_at)
        : undefined,
    },
    liftingModerator: liftedSuspension.liftingModerator
      ? {
          id: liftedSuspension.liftingModerator.id as string &
            tags.Format<"uuid">,
          username: liftedSuspension.liftingModerator.username,
          display_name: liftedSuspension.liftingModerator.display_name,
          profile_picture_url: liftedSuspension.liftingModerator
            .profile_picture_url
            ? (liftedSuspension.liftingModerator.profile_picture_url as string &
                tags.Format<"uri">)
            : null,
          email_verified: liftedSuspension.liftingModerator.email_verified,
          status: liftedSuspension.liftingModerator.status,
          moderation_permissions:
            liftedSuspension.liftingModerator.moderation_permissions,
          profile_visibility:
            liftedSuspension.liftingModerator.profile_visibility,
          activity_visibility:
            liftedSuspension.liftingModerator.activity_visibility,
          bio:
            liftedSuspension.liftingModerator.bio === null
              ? undefined
              : liftedSuspension.liftingModerator.bio,
          location:
            liftedSuspension.liftingModerator.location === null
              ? undefined
              : liftedSuspension.liftingModerator.location,
          website_url: liftedSuspension.liftingModerator.website_url
            ? (liftedSuspension.liftingModerator.website_url as string &
                tags.Format<"uri">)
            : undefined,
          last_login_at: liftedSuspension.liftingModerator.last_login_at
            ? toISOStringSafe(liftedSuspension.liftingModerator.last_login_at)
            : undefined,
          created_at: toISOStringSafe(
            liftedSuspension.liftingModerator.created_at,
          ),
          updated_at: toISOStringSafe(
            liftedSuspension.liftingModerator.updated_at,
          ),
          deleted_at: liftedSuspension.liftingModerator.deleted_at
            ? toISOStringSafe(liftedSuspension.liftingModerator.deleted_at)
            : undefined,
        }
      : undefined,
  };
}

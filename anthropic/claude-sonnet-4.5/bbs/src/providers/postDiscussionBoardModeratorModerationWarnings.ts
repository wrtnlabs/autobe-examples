import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorModerationWarnings(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardUserWarning.ICreate;
}): Promise<IDiscussionBoardUserWarning> {
  const { moderator, body } = props;

  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: body.discussion_board_member_id,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Target member not found or has been deleted", 404);
  }

  if (
    body.related_moderation_action_id !== undefined &&
    body.related_moderation_action_id !== null
  ) {
    const moderationAction =
      await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
        where: { id: body.related_moderation_action_id },
      });

    if (!moderationAction) {
      throw new HttpException("Related moderation action not found", 404);
    }
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_user_warnings.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: body.discussion_board_member_id,
      discussion_board_moderator_id: moderator.id,
      related_moderation_action_id:
        body.related_moderation_action_id ?? undefined,
      warning_reason: body.warning_reason,
      warning_details: body.warning_details,
      severity: body.severity,
      acknowledged_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      warnedUser: true,
      issuingModerator: true,
      relatedModerationAction: {
        include: {
          moderator: true,
        },
      },
    },
  });

  const warnedUser: IDiscussionBoardMember.ISummary = {
    id: created.warnedUser.id as string & tags.Format<"uuid">,
    username: created.warnedUser.username,
    display_name:
      created.warnedUser.display_name === null
        ? undefined
        : created.warnedUser.display_name,
    profile_picture_url:
      created.warnedUser.profile_picture_url === null
        ? undefined
        : (created.warnedUser.profile_picture_url as string &
            tags.Format<"uri">),
  };

  const issuingModerator: IDiscussionBoardModerator.ISummary = {
    id: created.issuingModerator.id as string & tags.Format<"uuid">,
    username: created.issuingModerator.username,
    display_name: created.issuingModerator.display_name,
    profile_picture_url: created.issuingModerator.profile_picture_url
      ? (created.issuingModerator.profile_picture_url as string &
          tags.Format<"uri">)
      : null,
    email_verified: created.issuingModerator.email_verified,
    status: created.issuingModerator.status,
    moderation_permissions: created.issuingModerator.moderation_permissions,
    profile_visibility: created.issuingModerator.profile_visibility,
    activity_visibility: created.issuingModerator.activity_visibility,
    bio:
      created.issuingModerator.bio === null
        ? undefined
        : created.issuingModerator.bio,
    location:
      created.issuingModerator.location === null
        ? undefined
        : created.issuingModerator.location,
    website_url:
      created.issuingModerator.website_url === null
        ? undefined
        : (created.issuingModerator.website_url as string & tags.Format<"uri">),
    last_login_at:
      created.issuingModerator.last_login_at === null
        ? undefined
        : toISOStringSafe(created.issuingModerator.last_login_at),
    created_at: toISOStringSafe(created.issuingModerator.created_at),
    updated_at: toISOStringSafe(created.issuingModerator.updated_at),
    deleted_at:
      created.issuingModerator.deleted_at === null
        ? undefined
        : toISOStringSafe(created.issuingModerator.deleted_at),
  };

  const relatedModerationAction: IDiscussionBoardModerationAction.ISummary | null =
    created.relatedModerationAction
      ? {
          id: created.relatedModerationAction.id as string &
            tags.Format<"uuid">,
          moderator: {
            id: created.relatedModerationAction.moderator.id as string &
              tags.Format<"uuid">,
            username: created.relatedModerationAction.moderator.username,
            display_name:
              created.relatedModerationAction.moderator.display_name,
            profile_picture_url: created.relatedModerationAction.moderator
              .profile_picture_url
              ? (created.relatedModerationAction.moderator
                  .profile_picture_url as string & tags.Format<"uri">)
              : null,
            email_verified:
              created.relatedModerationAction.moderator.email_verified,
            status: created.relatedModerationAction.moderator.status,
            moderation_permissions:
              created.relatedModerationAction.moderator.moderation_permissions,
            profile_visibility:
              created.relatedModerationAction.moderator.profile_visibility,
            activity_visibility:
              created.relatedModerationAction.moderator.activity_visibility,
            bio:
              created.relatedModerationAction.moderator.bio === null
                ? undefined
                : created.relatedModerationAction.moderator.bio,
            location:
              created.relatedModerationAction.moderator.location === null
                ? undefined
                : created.relatedModerationAction.moderator.location,
            website_url:
              created.relatedModerationAction.moderator.website_url === null
                ? undefined
                : (created.relatedModerationAction.moderator
                    .website_url as string & tags.Format<"uri">),
            last_login_at:
              created.relatedModerationAction.moderator.last_login_at === null
                ? undefined
                : toISOStringSafe(
                    created.relatedModerationAction.moderator.last_login_at,
                  ),
            created_at: toISOStringSafe(
              created.relatedModerationAction.moderator.created_at,
            ),
            updated_at: toISOStringSafe(
              created.relatedModerationAction.moderator.updated_at,
            ),
            deleted_at:
              created.relatedModerationAction.moderator.deleted_at === null
                ? undefined
                : toISOStringSafe(
                    created.relatedModerationAction.moderator.deleted_at,
                  ),
          },
          action_type: created.relatedModerationAction.action_type,
          target_type: created.relatedModerationAction.target_type,
          target_id: created.relatedModerationAction.target_id as string &
            tags.Format<"uuid">,
          reason: created.relatedModerationAction.reason,
          created_at: toISOStringSafe(
            created.relatedModerationAction.created_at,
          ),
          updated_at: toISOStringSafe(
            created.relatedModerationAction.updated_at,
          ),
        }
      : null;

  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_member_id: created.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_moderator_id:
      created.discussion_board_moderator_id as string & tags.Format<"uuid">,
    related_moderation_action_id: created.related_moderation_action_id
      ? (created.related_moderation_action_id as string & tags.Format<"uuid">)
      : null,
    warnedUser,
    issuingModerator,
    relatedModerationAction,
    warning_reason: created.warning_reason,
    warning_details: created.warning_details,
    severity: created.severity,
    acknowledged_at: created.acknowledged_at
      ? toISOStringSafe(created.acknowledged_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import { IPageIDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserWarning";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationWarnings(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardUserWarning.IRequest;
}): Promise<IPageIDiscussionBoardUserWarning.ISummary> {
  const { moderator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [warnings, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_warnings.findMany({
      where: {
        deleted_at: null,
        ...(body.discussion_board_member_id !== undefined &&
          body.discussion_board_member_id !== null && {
            discussion_board_member_id: body.discussion_board_member_id,
          }),
        ...(body.discussion_board_moderator_id !== undefined &&
          body.discussion_board_moderator_id !== null && {
            discussion_board_moderator_id: body.discussion_board_moderator_id,
          }),
        ...(body.related_moderation_action_id !== undefined &&
          body.related_moderation_action_id !== null && {
            related_moderation_action_id: body.related_moderation_action_id,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity: body.severity,
          }),
        ...(body.warning_reason !== undefined &&
          body.warning_reason !== null && {
            warning_reason: body.warning_reason,
          }),
        ...(body.acknowledged !== undefined &&
          body.acknowledged !== null && {
            acknowledged_at: body.acknowledged ? { not: null } : null,
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
      include: {
        warnedUser: true,
        issuingModerator: true,
      },
      orderBy:
        body.sort_by === "severity"
          ? { severity: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "acknowledged_at"
            ? { acknowledged_at: body.sort_order === "asc" ? "asc" : "desc" }
            : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_user_warnings.count({
      where: {
        deleted_at: null,
        ...(body.discussion_board_member_id !== undefined &&
          body.discussion_board_member_id !== null && {
            discussion_board_member_id: body.discussion_board_member_id,
          }),
        ...(body.discussion_board_moderator_id !== undefined &&
          body.discussion_board_moderator_id !== null && {
            discussion_board_moderator_id: body.discussion_board_moderator_id,
          }),
        ...(body.related_moderation_action_id !== undefined &&
          body.related_moderation_action_id !== null && {
            related_moderation_action_id: body.related_moderation_action_id,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity: body.severity,
          }),
        ...(body.warning_reason !== undefined &&
          body.warning_reason !== null && {
            warning_reason: body.warning_reason,
          }),
        ...(body.acknowledged !== undefined &&
          body.acknowledged !== null && {
            acknowledged_at: body.acknowledged ? { not: null } : null,
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IDiscussionBoardUserWarning.ISummary[] = warnings.map(
    (warning) => ({
      id: warning.id,
      discussion_board_member_id: warning.discussion_board_member_id,
      discussion_board_moderator_id: warning.discussion_board_moderator_id,
      related_moderation_action_id: warning.related_moderation_action_id,
      warnedUser: {
        id: warning.warnedUser.id,
        username: warning.warnedUser.username,
        display_name: warning.warnedUser.display_name ?? undefined,
        profile_picture_url:
          warning.warnedUser.profile_picture_url ?? undefined,
      },
      warning_reason: warning.warning_reason,
      warning_details: warning.warning_details,
      severity: warning.severity,
      acknowledged_at: warning.acknowledged_at
        ? toISOStringSafe(warning.acknowledged_at)
        : null,
      created_at: toISOStringSafe(warning.created_at),
      updated_at: toISOStringSafe(warning.updated_at),
      deleted_at: warning.deleted_at
        ? toISOStringSafe(warning.deleted_at)
        : null,
      issuing_moderator: {
        id: warning.issuingModerator.id,
        username: warning.issuingModerator.username,
        display_name: warning.issuingModerator.display_name,
        profile_picture_url: warning.issuingModerator.profile_picture_url,
        email_verified: warning.issuingModerator.email_verified,
        status: warning.issuingModerator.status,
        moderation_permissions: warning.issuingModerator.moderation_permissions,
        profile_visibility: warning.issuingModerator.profile_visibility,
        activity_visibility: warning.issuingModerator.activity_visibility,
        bio: warning.issuingModerator.bio ?? undefined,
        location: warning.issuingModerator.location ?? undefined,
        website_url: warning.issuingModerator.website_url ?? undefined,
        last_login_at: warning.issuingModerator.last_login_at
          ? toISOStringSafe(warning.issuingModerator.last_login_at)
          : undefined,
        created_at: toISOStringSafe(warning.issuingModerator.created_at),
        updated_at: toISOStringSafe(warning.issuingModerator.updated_at),
        deleted_at: warning.issuingModerator.deleted_at
          ? toISOStringSafe(warning.issuingModerator.deleted_at)
          : undefined,
      },
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

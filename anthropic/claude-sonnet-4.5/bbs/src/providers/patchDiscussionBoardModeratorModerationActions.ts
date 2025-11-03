import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const { body } = props;

  // Extract pagination parameters with double-cast pattern
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  // Build reusable WHERE clause with all filters
  const whereCondition = {
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && {
        discussion_board_moderator_id: body.moderator_id,
      }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && {
        action_type: body.action_type,
      }),
    ...(body.target_type !== undefined &&
      body.target_type !== null && {
        target_type: body.target_type,
      }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && {
        target_id: body.target_id,
      }),
    ...(body.related_report_id !== undefined &&
      body.related_report_id !== null && {
        related_report_id: body.related_report_id,
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
  };

  // Determine sort order based on sort parameter
  const orderBy =
    body.sort === "oldest_first"
      ? { created_at: "asc" as const }
      : body.sort === "by_moderator"
        ? [
            { discussion_board_moderator_id: "asc" as const },
            { created_at: "desc" as const },
          ]
        : body.sort === "by_action_type"
          ? [{ action_type: "asc" as const }, { created_at: "desc" as const }]
          : { created_at: "desc" as const };

  // Execute parallel queries with shared where condition
  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: whereCondition,
      include: {
        moderator: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: whereCondition,
    }),
  ]);

  // Map results to ISummary format with proper null→undefined conversion
  const data: IDiscussionBoardModerationAction.ISummary[] = results.map(
    (action) => ({
      id: action.id,
      moderator: {
        id: action.moderator.id,
        username: action.moderator.username,
        display_name: action.moderator.display_name,
        profile_picture_url: action.moderator.profile_picture_url,
        email_verified: action.moderator.email_verified,
        status: action.moderator.status,
        moderation_permissions: action.moderator.moderation_permissions,
        profile_visibility: action.moderator.profile_visibility,
        activity_visibility: action.moderator.activity_visibility,
        bio: action.moderator.bio === null ? undefined : action.moderator.bio,
        location:
          action.moderator.location === null
            ? undefined
            : action.moderator.location,
        website_url:
          action.moderator.website_url === null
            ? undefined
            : action.moderator.website_url,
        last_login_at:
          action.moderator.last_login_at === null
            ? undefined
            : toISOStringSafe(action.moderator.last_login_at),
        created_at: toISOStringSafe(action.moderator.created_at),
        updated_at: toISOStringSafe(action.moderator.updated_at),
        deleted_at:
          action.moderator.deleted_at === null
            ? undefined
            : toISOStringSafe(action.moderator.deleted_at),
      },
      action_type: action.action_type,
      target_type: action.target_type,
      target_id: action.target_id,
      reason: action.reason,
      created_at: toISOStringSafe(action.created_at),
      updated_at: toISOStringSafe(action.updated_at),
    }),
  );

  // Return paginated response with Number() for brand type stripping
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

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationAction.IRequest;
}): Promise<IPageICommunityPlatformModerationAction.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;

  // Only support sorting by allowed fields
  const allowedSortFields = ["created_at", "action_type", "actor_id"];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build where clause using only nullable and allowed properties
  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
    ...(body.target_post_id !== undefined &&
      body.target_post_id !== null && { target_post_id: body.target_post_id }),
    ...(body.target_comment_id !== undefined &&
      body.target_comment_id !== null && {
        target_comment_id: body.target_comment_id,
      }),
    ...(body.report_id !== undefined &&
      body.report_id !== null && { report_id: body.report_id }),
    // Date-range filters
    ...(body.start_time !== undefined || body.end_time !== undefined
      ? {
          created_at: {
            ...(body.start_time !== undefined &&
              body.start_time !== null && { gte: body.start_time }),
            ...(body.end_time !== undefined &&
              body.end_time !== null && { lte: body.end_time }),
          },
        }
      : {}),
    // Fuzzy search on description
    ...(body.description_query !== undefined &&
    body.description_query !== null &&
    body.description_query.length > 0
      ? { description: { contains: body.description_query } }
      : {}),
  };

  // Query list and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_actions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action_type: true,
        target_post_id: true,
        target_comment_id: true,
        report_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_moderation_actions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      action_type: row.action_type,
      target_post_id: row.target_post_id ?? undefined,
      target_comment_id: row.target_comment_id ?? undefined,
      report_id: row.report_id ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}

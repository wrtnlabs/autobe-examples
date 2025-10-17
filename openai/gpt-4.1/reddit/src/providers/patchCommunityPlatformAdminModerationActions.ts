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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminModerationActions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationAction.IRequest;
}): Promise<IPageICommunityPlatformModerationAction.ISummary> {
  const body = props.body;

  // Pagination defaults per platform standard
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    body.limit ??
    (20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>);
  const pageSafe = Number(page);
  const limitSafe = Math.min(200, Number(limit));
  const skip = (pageSafe - 1) * limitSafe;

  const sortableFields = ["created_at", "action_type", "actor_id"] as const;
  const requestedSort =
    body.sort_by &&
    sortableFields.includes(body.sort_by as (typeof sortableFields)[number])
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.community_id !== undefined &&
      body.community_id !== null && { community_id: body.community_id }),
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
    ...(body.description_query !== undefined &&
      body.description_query !== null &&
      body.description_query.trim().length > 0 && {
        description: {
          contains: body.description_query,
        },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_actions.findMany({
      where,
      orderBy: {
        [requestedSort]: sortOrder,
      },
      skip,
      take: limitSafe,
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

  const data = rows.map((row) => {
    return {
      id: row.id,
      action_type: row.action_type,
      target_post_id: row.target_post_id ?? undefined,
      target_comment_id: row.target_comment_id ?? undefined,
      report_id: row.report_id ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  return {
    pagination: {
      current: Number(pageSafe),
      limit: Number(limitSafe),
      records: total,
      pages: Math.ceil(total / limitSafe),
    },
    data,
  };
}

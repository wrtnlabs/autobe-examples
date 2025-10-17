import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminModerationQueues(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationQueue.IRequest;
}): Promise<IPageICommunityPlatformModerationQueue.ISummary> {
  // Allowed sort fields
  const allowedSort: Record<string, true> = {
    created_at: true,
    updated_at: true,
    priority: true,
    status: true,
  };
  const pageNum = props.body.page ?? 1;
  const limitNum = props.body.limit ?? 20;
  const sortField =
    props.body.sort && allowedSort[props.body.sort]
      ? props.body.sort
      : "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.order === "asc" || props.body.order === "desc"
      ? props.body.order
      : "desc";
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  const where = {
    deleted_at: null,
    ...(props.body.community_id != null && {
      community_id: props.body.community_id,
    }),
    ...(props.body.assigned_moderator_id != null && {
      assigned_moderator_id: props.body.assigned_moderator_id,
    }),
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.priority != null && { priority: props.body.priority }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_queues.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take,
      select: {
        id: true,
        community_id: true,
        report_id: true,
        assigned_moderator_id: true,
        status: true,
        priority: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_moderation_queues.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_id: row.community_id,
      report_id: row.report_id,
      assigned_moderator_id: row.assigned_moderator_id ?? undefined,
      status: row.status,
      priority: row.priority,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}

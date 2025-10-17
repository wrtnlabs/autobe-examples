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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorModerationQueues(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationQueue.IRequest;
}): Promise<IPageICommunityPlatformModerationQueue.ISummary> {
  const { moderator, body } = props;
  // 1. Determine which communities the moderator is assigned to (enforce scoping)
  const assignedCommunityRecords =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findMany(
      {
        where: {
          member_id: moderator.id,
          end_at: null,
        },
        select: {
          community_id: true,
        },
      },
    );
  const assignedCommunityIds = assignedCommunityRecords.map(
    (r) => r.community_id,
  );

  // If filter requests a community_id, ensure it's in assigned, or return empty/no access
  if (
    body.community_id !== undefined &&
    !assignedCommunityIds.includes(body.community_id)
  ) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where filter: always restrict communities to assigned
  const where = {
    ...(body.community_id !== undefined && { community_id: body.community_id }),
    ...(body.assigned_moderator_id !== undefined && {
      assigned_moderator_id: body.assigned_moderator_id,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.priority !== undefined && { priority: body.priority }),
    // Soft assignment overtaking: force filter to only assigned communities
    ...(body.community_id === undefined && {
      community_id: { in: assignedCommunityIds },
    }),
  };

  // orderBy
  let orderBy: { [k: string]: "asc" | "desc" };
  if (body.sort !== undefined && body.order !== undefined) {
    orderBy = { [body.sort]: body.order };
  } else {
    // Default sort: created_at desc
    orderBy = { created_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_queues.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_moderation_queues.count({
      where,
    }),
  ]);

  // Map to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    report_id: row.report_id,
    assigned_moderator_id: row.assigned_moderator_id ?? undefined,
    status: row.status,
    priority: row.priority,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

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

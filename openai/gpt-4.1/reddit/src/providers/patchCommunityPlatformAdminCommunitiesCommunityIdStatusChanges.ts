import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";
import { IPageICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityStatusChange";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdStatusChanges(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityStatusChange.IRequest;
}): Promise<IPageICommunityPlatformCommunityStatusChange> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Filtering
  const where = {
    community_id: props.communityId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        OR: [
          { previous_status: props.body.status },
          { new_status: props.body.status },
        ],
      }),
    ...(props.body.performed_by_id !== undefined &&
      props.body.performed_by_id !== null && {
        performed_by_id: props.body.performed_by_id,
      }),
    ...(props.body.from !== undefined &&
      props.body.from !== null && {
        created_at: {
          ...(props.body.from && { gte: props.body.from }),
          ...(props.body.to !== undefined &&
            props.body.to !== null && { lte: props.body.to }),
        },
      }),
    // If only 'to' is set without 'from'
    ...((props.body.from === undefined || props.body.from === null) &&
      props.body.to !== undefined &&
      props.body.to !== null && {
        created_at: { lte: props.body.to },
      }),
  };

  // Sorting
  const allowedSort = ["created_at", "previous_status", "new_status"] as const;
  let sort: "created_at" | "previous_status" | "new_status" = "created_at";
  if (props.body.sort !== undefined && allowedSort.includes(props.body.sort)) {
    sort = props.body.sort;
  }
  const order: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";

  // Query data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_status_changes.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_status_changes.count({
      where,
    }),
  ]);

  // Transform results
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    performed_by_id: row.performed_by_id,
    previous_status: row.previous_status,
    new_status: row.new_status,
    change_reason: row.change_reason ?? undefined,
    notes: row.notes ?? undefined,
    created_at: toISOStringSafe(row.created_at),
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

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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdStatusChanges(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityStatusChange.IRequest;
}): Promise<IPageICommunityPlatformCommunityStatusChange> {
  // Authorization: ensure moderator is assigned to the target community, active, not deleted
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: props.communityId,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: Only moderators of this community have access",
      403,
    );
  }

  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting logic
  const allowedSort: Array<"created_at" | "previous_status" | "new_status"> = [
    "created_at",
    "previous_status",
    "new_status",
  ];
  const sort = allowedSort.includes(props.body.sort as any)
    ? (props.body.sort as "created_at" | "previous_status" | "new_status")
    : "created_at";
  const order = props.body.order === "asc" ? "asc" : "desc";

  // Build where clause for filters
  const where: Record<string, unknown> = {
    community_id: props.communityId,
    ...(props.body.performed_by_id !== undefined &&
      props.body.performed_by_id !== null && {
        performed_by_id: props.body.performed_by_id,
      }),
    ...(props.body.status !== undefined && props.body.status !== null
      ? {
          OR: [
            { previous_status: props.body.status },
            { new_status: props.body.status },
          ],
        }
      : {}),
    ...(props.body.from || props.body.to
      ? {
          created_at: {
            ...(props.body.from && { gte: props.body.from }),
            ...(props.body.to && { lte: props.body.to }),
          },
        }
      : {}),
  };

  // Query records and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_status_changes.findMany({
      where,
      orderBy: {
        [sort]: order,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_status_changes.count({
      where,
    }),
  ]);

  // Construct and map result rows
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    performed_by_id: row.performed_by_id,
    previous_status: row.previous_status,
    new_status: row.new_status,
    change_reason: row.change_reason ?? null,
    notes: row.notes ?? null,
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

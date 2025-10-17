import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import { IPageICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorAssignment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdModeratorAssignments(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.IRequest;
}): Promise<IPageICommunityPlatformCommunityModeratorAssignment.ISummary> {
  // Authorization: moderator must have an active, non-ended assignment for this community
  const assignmentAuth =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          member_id: props.moderator.id,
          community_id: props.communityId,
          end_at: null,
        },
      },
    );
  if (!assignmentAuth) {
    throw new HttpException(
      "Forbidden: Not an active moderator of this community",
      403,
    );
  }

  // Pagination
  const page = props.body.page ?? 1;
  const limit = (props.body.limit ?? 20) > 100 ? 100 : (props.body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Allowed sortable fields
  const allowedOrderFields = [
    "id",
    "community_id",
    "member_id",
    "role",
    "assigned_by_id",
    "start_at",
    "end_at",
    "created_at",
    "updated_at",
    "note",
  ];

  let orderByField = allowedOrderFields.includes(props.body.order_by ?? "")
    ? props.body.order_by!
    : "created_at";
  let orderByDir = props.body.order_dir === "asc" ? "asc" : "desc";

  // WHERE clause (all optional filters)
  const where = {
    community_id: props.communityId,
    ...(props.body.member_id !== undefined &&
      props.body.member_id !== null && { member_id: props.body.member_id }),
    ...(props.body.role !== undefined &&
      props.body.role !== null && { role: props.body.role }),
    ...(props.body.assigned_by_id !== undefined &&
      props.body.assigned_by_id !== null && {
        assigned_by_id: props.body.assigned_by_id,
      }),
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}), // not in schema; skip
    ...((props.body.start_at_from !== undefined &&
      props.body.start_at_from !== null) ||
    (props.body.start_at_to !== undefined && props.body.start_at_to !== null)
      ? {
          start_at: {
            ...(props.body.start_at_from !== undefined &&
              props.body.start_at_from !== null && {
                gte: props.body.start_at_from,
              }),
            ...(props.body.start_at_to !== undefined &&
              props.body.start_at_to !== null && {
                lte: props.body.start_at_to,
              }),
          },
        }
      : {}),
    ...((props.body.end_at_from !== undefined &&
      props.body.end_at_from !== null) ||
    (props.body.end_at_to !== undefined && props.body.end_at_to !== null)
      ? {
          end_at: {
            ...(props.body.end_at_from !== undefined &&
              props.body.end_at_from !== null && {
                gte: props.body.end_at_from,
              }),
            ...(props.body.end_at_to !== undefined &&
              props.body.end_at_to !== null && { lte: props.body.end_at_to }),
          },
        }
      : {}),
    ...(props.body.note !== undefined &&
      props.body.note !== null && { note: { contains: props.body.note } }),
  };

  // Query records + total count (for pagination)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_moderator_assignments.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDir },
        select: {
          id: true,
          community_id: true,
          member_id: true,
          role: true,
          assigned_by_id: true,
          start_at: true,
          end_at: true,
          note: true,
          created_at: true,
          updated_at: true,
        },
      },
    ),
    MyGlobal.prisma.community_platform_community_moderator_assignments.count({
      where,
    }),
  ]);

  // Map to ISummary type
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    member_id: row.member_id,
    role: row.role,
    assigned_by_id: row.assigned_by_id,
    start_at: toISOStringSafe(row.start_at),
    end_at: row.end_at == null ? null : toISOStringSafe(row.end_at),
    note: row.note ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}

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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModeratorAssignments(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorAssignment.IRequest;
}): Promise<IPageICommunityPlatformCommunityModeratorAssignment.ISummary> {
  const { communityId, body } = props;
  // Default pagination
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    body.limit ??
    (20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>);
  // Build where clause
  const where = {
    community_id: communityId,
    ...(body.member_id !== undefined && { member_id: body.member_id }),
    ...(body.role !== undefined && { role: body.role }),
    ...(body.assigned_by_id !== undefined && {
      assigned_by_id: body.assigned_by_id,
    }),
    ...(body.status !== undefined &&
      body.status !== null && {
        end_at: body.status === "active" ? null : { not: null },
      }),
    ...(body.start_at_from !== undefined && {
      start_at: { gte: body.start_at_from },
    }),
    ...(body.start_at_to !== undefined && {
      start_at: Object.assign(
        {},
        body.start_at_from && { gte: body.start_at_from },
        { lte: body.start_at_to },
      ),
    }),
    ...(body.end_at_from !== undefined && {
      end_at: { gte: body.end_at_from },
    }),
    ...(body.end_at_to !== undefined && {
      end_at: Object.assign({}, body.end_at_from && { gte: body.end_at_from }, {
        lte: body.end_at_to,
      }),
    }),
    ...(body.note !== undefined && { note: { contains: body.note } }),
  };
  // Determine order by
  const sortableFields = ["created_at", "updated_at", "start_at", "end_at"];
  const orderField =
    body.order_by && sortableFields.includes(body.order_by)
      ? body.order_by
      : "created_at";
  const orderDir = body.order_dir === "asc" ? "asc" : "desc";

  // Query total count
  const total =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.count(
      { where },
    );

  // Query paginated results
  const rows =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findMany(
      {
        where,
        orderBy: { [orderField]: orderDir },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      },
    );
  // Map to ISummary DTO
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    member_id: row.member_id,
    role: row.role,
    assigned_by_id: row.assigned_by_id,
    start_at: toISOStringSafe(row.start_at),
    end_at: row.end_at ? toISOStringSafe(row.end_at) : null,
    note: row.note ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / Number(limit)),
    },
    data,
  };
}

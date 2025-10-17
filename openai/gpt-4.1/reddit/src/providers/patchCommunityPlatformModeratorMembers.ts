import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorMembers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const { body } = props;

  // Pagination
  const page = (body.page ?? 1) <= 0 ? 1 : (body.page ?? 1);
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Allowed sort fields
  const allowedSortFields = ["created_at", "updated_at", "email"];
  const sortField = allowedSortFields.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build date range objects
  let createdAt: { gte?: string; lte?: string } = {};
  if (body.createdAtFrom !== undefined && body.createdAtFrom !== null) {
    createdAt.gte = body.createdAtFrom;
  }
  if (body.createdAtTo !== undefined && body.createdAtTo !== null) {
    createdAt.lte = body.createdAtTo;
  }
  let updatedAt: { gte?: string; lte?: string } = {};
  if (body.updatedAtFrom !== undefined && body.updatedAtFrom !== null) {
    updatedAt.gte = body.updatedAtFrom;
  }
  if (body.updatedAtTo !== undefined && body.updatedAtTo !== null) {
    updatedAt.lte = body.updatedAtTo;
  }

  // Compose where clause
  const where: Record<string, any> = {
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(Object.keys(createdAt).length > 0 && { created_at: createdAt }),
    ...(Object.keys(updatedAt).length > 0 && { updated_at: updatedAt }),
  };

  // Special handling for deleted status
  if (body.status === "deleted") {
    where.deleted_at = { not: null };
  } else {
    where.deleted_at = null;
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_members.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        email_verified: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_members.count({ where }),
  ]);

  const data = rows.map((row) => {
    const result: ICommunityPlatformMember.ISummary = {
      id: row.id,
      email: row.email,
      email_verified: row.email_verified,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    if (row.deleted_at !== null && row.deleted_at !== undefined) {
      result.deleted_at = toISOStringSafe(row.deleted_at);
    }
    return result;
  });

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

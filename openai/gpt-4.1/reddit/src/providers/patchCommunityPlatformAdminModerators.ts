import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminModerators(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  const { body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  const allowedSort: Array<"created_at" | "updated_at"> = [
    "created_at",
    "updated_at",
  ];
  const sortBy =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";
  const where = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.community_id !== undefined &&
      body.community_id !== null && { community_id: body.community_id }),
    ...(body.member_id !== undefined &&
      body.member_id !== null && { member_id: body.member_id }),
    ...(body.email !== undefined && { email: body.email }),
    deleted_at: null,
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderators.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_moderators.count({ where }),
  ]);
  const data = rows.map((row) => {
    const summary: ICommunityPlatformModerator.ISummary = {
      id: row.id,
      member_id: row.member_id,
      community_id: row.community_id,
      email: row.email,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    if (row.deleted_at) {
      summary.deleted_at = toISOStringSafe(row.deleted_at);
    }
    return summary;
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / (limit || 1)),
    },
    data,
  };
}

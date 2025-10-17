import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAdmins(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  const body = props.body ?? {};
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Only allow certain fields for sort_by
  const allowedSortBy = ["created_at", "updated_at", "email"];
  const sortField =
    body.sort_by && allowedSortBy.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDir: "asc" | "desc" = body.sort_dir === "asc" ? "asc" : "desc";

  // Build WHERE
  const where = {
    ...(body.email ? { email: { contains: body.email } } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(typeof body.superuser === "boolean"
      ? { superuser: body.superuser }
      : {}),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from ? { gte: body.created_at_from } : {}),
            ...(body.created_at_to ? { lte: body.created_at_to } : {}),
          },
        }
      : {}),
    ...(body.updated_at_from || body.updated_at_to
      ? {
          updated_at: {
            ...(body.updated_at_from ? { gte: body.updated_at_from } : {}),
            ...(body.updated_at_to ? { lte: body.updated_at_to } : {}),
          },
        }
      : {}),
  };

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admins.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_admins.count({ where }),
  ]);

  const data = admins.map((admin) => {
    const summary: ICommunityPlatformAdmin.ISummary = {
      id: admin.id,
      email: admin.email,
      superuser: admin.superuser,
      status: admin.status,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      ...(admin.deleted_at !== null && typeof admin.deleted_at !== "undefined"
        ? { deleted_at: toISOStringSafe(admin.deleted_at) }
        : { deleted_at: null }),
    };
    return summary;
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

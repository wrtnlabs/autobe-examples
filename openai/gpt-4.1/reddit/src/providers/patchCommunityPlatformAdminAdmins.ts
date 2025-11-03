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
  const {
    page = 1,
    limit = 20,
    search,
    created_from,
    created_to,
    updated_from,
    updated_to,
    order_by = "created_at",
    order_direction = "desc",
  } = props.body ?? {};

  // Enforce numeric pagination, capping max page size at 100
  const safePage = Math.max(Number(page), 1);
  const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const where: Record<string, any> = { deleted_at: null };

  if (search) {
    // Use trigram index: search against display_name or email (OR)
    where.OR = [
      { display_name: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (created_from) {
    where.created_at = { ...(where.created_at ?? {}), gte: created_from };
  }
  if (created_to) {
    where.created_at = { ...(where.created_at ?? {}), lte: created_to };
  }
  if (updated_from) {
    where.updated_at = { ...(where.updated_at ?? {}), gte: updated_from };
  }
  if (updated_to) {
    where.updated_at = { ...(where.updated_at ?? {}), lte: updated_to };
  }

  const allowedOrderFields = [
    "display_name",
    "email",
    "created_at",
    "updated_at",
  ] as const;
  const sortField = allowedOrderFields.includes(order_by)
    ? order_by
    : "created_at";
  const sortDirection = order_direction === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admins.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take,
      select: { id: true, display_name: true },
    }),
    MyGlobal.prisma.community_platform_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
    })),
  };
}

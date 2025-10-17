import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemConfig.IRequest;
}): Promise<IPageICommunityPlatformSystemConfig> {
  const { body } = props;
  // Pagination controls with minimums
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Filtering
  const where: Record<string, any> = {
    ...(body.key !== undefined && {
      key: { contains: body.key },
    }),
    ...(body.description !== undefined && {
      description: { contains: body.description },
    }),
  };

  // Sorting logic
  const allowedSort: Array<"key" | "created_at" | "updated_at"> = [
    "key",
    "created_at",
    "updated_at",
  ];
  const sortBy =
    body.sort &&
    allowedSort.includes(body.sort as "key" | "created_at" | "updated_at")
      ? (body.sort as "key" | "created_at" | "updated_at")
      : "created_at";

  // Query DB in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_system_configs.findMany({
      where,
      orderBy: { [sortBy]: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_system_configs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}

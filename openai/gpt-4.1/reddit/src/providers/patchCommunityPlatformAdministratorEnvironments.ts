import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";
import { IPageICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEnvironment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorEnvironments(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformEnvironment.IRequest;
}): Promise<IPageICommunityPlatformEnvironment.ISummary> {
  const {
    env_key,
    display_name,
    is_active,
    sort_by,
    sort_order,
    page = 1,
    limit = 100,
  } = props.body || {};

  // Build filtering conditions
  const where: Record<string, unknown> = {};
  if (env_key) {
    where.env_key = { contains: env_key, mode: "insensitive" };
  }
  if (display_name) {
    where.display_name = { contains: display_name, mode: "insensitive" };
  }
  if (typeof is_active === "boolean") {
    if (is_active) {
      where.deleted_at = null;
    } else {
      where.deleted_at = { not: null };
    }
  }

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" }[] = [];
  if (sort_by) {
    orderBy.push({ [sort_by]: sort_order === "desc" ? "desc" : "asc" });
  } else {
    orderBy.push({ created_at: "desc" });
  }

  const skip = (page - 1) * limit;
  const take = limit;

  // Query from DB and count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_environments.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_environments.count({ where }),
  ]);

  return {
    data: records.map((row) => ({
      id: row.id,
      env_key: row.env_key,
      display_name: row.display_name,
      description: row.description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        typeof row.deleted_at === "object" && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : row.deleted_at === null
            ? null
            : undefined,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

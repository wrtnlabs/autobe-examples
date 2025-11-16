import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { IPageICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRankingAlgorithmConfigs";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorRankingAlgorithmConfigs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformRankingAlgorithmConfigs.IRequest;
}): Promise<IPageICommunityPlatformRankingAlgorithmConfigs.ISummary> {
  const {
    algorithm_name,
    version,
    is_active,
    created_from,
    created_to,
    order_by,
    order_direction,
    page = 1,
    limit = 20,
  } = props.body;

  const where: Record<string, unknown> = {
    deleted_at: null,
  };

  if (typeof algorithm_name === "string" && algorithm_name.length > 0) {
    where["algorithm_name"] = { contains: algorithm_name };
  }
  if (typeof version === "string" && version.length > 0) {
    where["version"] = { startsWith: version };
  }
  if (typeof is_active === "boolean") {
    where["is_active"] = is_active;
  }
  if (typeof created_from === "string") {
    where["created_at"] = where["created_at"] || {};
    (where["created_at"] as Record<string, unknown>)["gte"] = created_from;
  }
  if (typeof created_to === "string") {
    where["created_at"] = where["created_at"] || {};
    (where["created_at"] as Record<string, unknown>)["lte"] = created_to;
  }

  const skip = ((page ?? 1) - 1) * (limit ?? 20);
  const take = Math.min(Number(limit ?? 20), 100);

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_ranking_algorithm_configs.findMany({
      where,
      orderBy: order_by
        ? { [order_by]: order_direction === "asc" ? "asc" : "desc" }
        : { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_ranking_algorithm_configs.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page ?? 1),
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: records.map((row) => ({
      id: row.id,
      algorithm_name: row.algorithm_name,
      parameters_json: row.parameters_json,
      version: row.version,
      description:
        typeof row.description === "string"
          ? row.description
          : row.description === null
            ? null
            : undefined,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        typeof row.deleted_at === "string"
          ? row.deleted_at
          : row.deleted_at === null
            ? null
            : typeof row.deleted_at === "undefined"
              ? undefined
              : toISOStringSafe(row.deleted_at),
    })),
  };
}

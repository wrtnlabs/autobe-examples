import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";
import { IPageIEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumFeatureFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumFeatureFlag.IRequest;
}): Promise<IPageIEconPoliticalForumFeatureFlag.ISummary> {
  const { administrator, body } = props;

  if (!administrator || administrator.type !== "administrator") {
    throw new HttpException("Unauthorized", 401);
  }

  // Validate rollout bounds
  if (
    body.rolloutMin !== undefined &&
    (body.rolloutMin < 0 || body.rolloutMin > 100)
  )
    throw new HttpException("rolloutMin must be between 0 and 100", 400);
  if (
    body.rolloutMax !== undefined &&
    (body.rolloutMax < 0 || body.rolloutMax > 100)
  )
    throw new HttpException("rolloutMax must be between 0 and 100", 400);
  if (
    body.rolloutMin !== undefined &&
    body.rolloutMax !== undefined &&
    body.rolloutMin > body.rolloutMax
  )
    throw new HttpException(
      "rolloutMin cannot be greater than rolloutMax",
      400,
    );

  const page = Number(body.page ?? 1);
  if (page < 1) throw new HttpException("page must be >= 1", 400);

  const rawLimit = Number(body.limit ?? 25);
  if (rawLimit < 1) throw new HttpException("limit must be >= 1", 400);
  const limit = rawLimit > 200 ? 200 : rawLimit;

  // Build where clause (schema does NOT have environment/is_public fields)
  const where = {
    ...(body.key !== undefined &&
      body.key !== null && { key: { contains: body.key } }),
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.rolloutMin !== undefined || body.rolloutMax !== undefined
      ? {
          rollout_percentage: {
            ...(body.rolloutMin !== undefined && { gte: body.rolloutMin }),
            ...(body.rolloutMax !== undefined && { lte: body.rolloutMax }),
          },
        }
      : {}),
    ...(body.includeDeleted ? {} : { deleted_at: null }),
  };

  const orderBy = (
    body.sort === "key"
      ? { key: body.direction === "desc" ? "desc" : "asc" }
      : body.sort === "rollout_percentage"
        ? { rollout_percentage: body.direction === "desc" ? "desc" : "asc" }
        : { created_at: body.direction === "desc" ? "desc" : "asc" }
  ) as Prisma.econ_political_forum_feature_flagsOrderByWithRelationInput;

  const skip = (page - 1) * limit;
  const take = limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_feature_flags.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        key: true,
        enabled: true,
        rollout_percentage: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_forum_feature_flags.count({ where }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    key: r.key,
    enabled: r.enabled,
    rollout_percentage: r.rollout_percentage ?? null,
    description: r.description ?? null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
  }));

  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import { IPageIDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfig.IRequest;
}): Promise<IPageIDiscussionBoardSystemConfig.ISummary> {
  const { q, include_deleted, sort_by, sort_order, page, limit } = props.body;
  // Set pagination defaults and cap
  const pageNum = page ?? 1;
  const limitNum = limit ?? 100;
  const cappedLimit = limitNum > 100 ? 100 : limitNum;
  const skip = (pageNum - 1) * cappedLimit;

  // Build where condition
  const where: Record<string, unknown> = {
    ...(include_deleted ? {} : { deleted_at: null }),
    ...(q
      ? {
          OR: [
            { config_key: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  // Allowed sort_by fields
  const allowedSortBy = ["config_key", "created_at", "updated_at"];
  const orderByField = allowedSortBy.includes(sort_by ?? "")
    ? sort_by!
    : "config_key";
  const orderByDirection = sort_order === "desc" ? "desc" : "asc";

  // Query
  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_configs.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: cappedLimit,
    }),
    MyGlobal.prisma.discussion_board_system_configs.count({ where }),
  ]);
  return {
    pagination: {
      current: pageNum,
      limit: cappedLimit,
      records: total,
      pages: Math.ceil(total / cappedLimit),
    },
    data: records.map((cfg) => ({
      id: cfg.id,
      config_key: cfg.config_key,
      config_value: cfg.config_value,
      description: cfg.description ?? undefined,
      created_at: toISOStringSafe(cfg.created_at),
      updated_at: toISOStringSafe(cfg.updated_at),
      deleted_at: cfg.deleted_at ? toISOStringSafe(cfg.deleted_at) : undefined,
    })),
  };
}

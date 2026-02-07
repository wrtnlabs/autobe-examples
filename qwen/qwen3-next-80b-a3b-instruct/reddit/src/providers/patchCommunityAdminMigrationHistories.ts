import { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMigrationHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminMigrationHistories(props: {
  admin: AdminPayload;
  body: ICommunityMigrationHistory.IRequest;
}): Promise<IPageICommunityMigrationHistory.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_migration_histories.findMany({
    take: limit,
    skip: skip,
    orderBy: {
      applied_at: "desc",
    },
    select: {
      id: true,
      version: true,
      patch_name: true,
      status: true,
      applied_at: true,
      applied_by_id: true,
    },
  });
  const total = await MyGlobal.prisma.community_migration_histories.count({});
  const summaryData = data.map((item) => ({
    applied_by_id: item.applied_by_id,
    version: item.version,
    patch_name: item.patch_name,
    status: typia.assert<"applied" | "failed" | "rolled_back">(item.status),
    applied_at: toISOStringSafe(item.applied_at),
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

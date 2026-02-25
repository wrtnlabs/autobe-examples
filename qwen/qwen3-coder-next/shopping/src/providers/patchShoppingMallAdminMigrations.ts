import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemMigration";
import { IShoppingMallSystemMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemMigration";
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

export async function patchShoppingMallAdminMigrations(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemMigration.IRequest;
}): Promise<IPageIShoppingMallSystemMigration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search && {
      migration_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.startedAt && {
      executed_at: { gte: new Date(props.body.startedAt) },
    }),
    ...(props.body.endedAt && {
      executed_at: { lte: new Date(props.body.endedAt) },
    }),
  } satisfies Prisma.shopping_mall_system_migrationsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_system_migrations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { executed_at: "desc" },
    select: {
      id: true,
      migration_name: true,
      executed_at: true,
      migration_hash: true,
      admin_id: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_system_migrations.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      migration_name: record.migration_name,
      executed_at: toISOStringSafe(record.executed_at),
      migration_hash: record.migration_hash,
      admin_id: record.admin_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

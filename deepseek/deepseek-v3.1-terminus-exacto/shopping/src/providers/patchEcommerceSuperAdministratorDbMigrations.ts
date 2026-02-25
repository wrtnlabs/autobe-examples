import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDbMigration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceDbMigrationTransformer } from "../transformers/EcommerceDbMigrationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorDbMigrations(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceDbMigration.IRequest;
}): Promise<IPageIEcommerceDbMigration> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic WHERE clause with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.migration_name && {
      migration_name: { contains: props.body.migration_name },
    }),
    ...(props.body.version && {
      version: props.body.version,
    }),
    ...(props.body.execution_status && {
      execution_status: props.body.execution_status,
    }),
    ...(props.body.executed_at_start && {
      executed_at: { gte: new Date(props.body.executed_at_start) },
    }),
    ...(props.body.executed_at_end && {
      executed_at: { lte: new Date(props.body.executed_at_end) },
    }),
  } satisfies Prisma.ecommerce_db_migrationsWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.ecommerce_db_migrations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { executed_at: "desc" },
    ...EcommerceDbMigrationTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_db_migrations.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceDbMigrationTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

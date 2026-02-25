import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceDbMigrationTransformer } from "../transformers/EcommerceDbMigrationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorDbMigrationsMigrationId(props: {
  administrator: AdministratorPayload;
  migrationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDbMigration> {
  // Retrieve a specific migration by ID using the shared transformer
  // The administrator authorization is already validated by the decorator
  const migration =
    await MyGlobal.prisma.ecommerce_db_migrations.findUniqueOrThrow({
      where: {
        id: props.migrationId,
        deleted_at: null, // Filter out soft-deleted records
      },
      ...EcommerceDbMigrationTransformer.select(),
    });
  return await EcommerceDbMigrationTransformer.transform(migration);
}

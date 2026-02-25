import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceSuperAdministratorDbMigrationsMigrationId(props: {
  superAdministrator: SuperadministratorPayload;
  migrationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDbMigration> {
  const migration =
    await MyGlobal.prisma.ecommerce_db_migrations.findUniqueOrThrow({
      where: {
        id: props.migrationId,
        deleted_at: null,
      },
      ...EcommerceDbMigrationTransformer.select(),
    });
  return await EcommerceDbMigrationTransformer.transform(migration);
}

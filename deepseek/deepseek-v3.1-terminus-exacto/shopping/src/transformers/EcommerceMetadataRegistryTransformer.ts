import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAuditLogAtSummaryTransformer } from "./EcommerceAuditLogAtSummaryTransformer";
import { EcommerceDbMigrationAtSummaryTransformer } from "./EcommerceDbMigrationAtSummaryTransformer";
import { EcommerceSystemSettingAtSummaryTransformer } from "./EcommerceSystemSettingAtSummaryTransformer";

export namespace EcommerceMetadataRegistryTransformer {
  export type Payload = Prisma.ecommerce_metadata_registriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        schema_name: true,
        schema_version: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        systemSetting: EcommerceSystemSettingAtSummaryTransformer.select(),
        auditLog: EcommerceAuditLogAtSummaryTransformer.select(),
        dbMigration: EcommerceDbMigrationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_metadata_registriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistry> {
    return {
      id: input.id,
      schema_name: input.schema_name,
      schema_version: input.schema_version,
      description: input.description ?? undefined,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      system_setting: input.systemSetting
        ? await EcommerceSystemSettingAtSummaryTransformer.transform(
            input.systemSetting,
          )
        : null,
      audit_log: input.auditLog
        ? await EcommerceAuditLogAtSummaryTransformer.transform(input.auditLog)
        : null,
      db_migration: input.dbMigration
        ? await EcommerceDbMigrationAtSummaryTransformer.transform(
            input.dbMigration,
          )
        : null,
    };
  }
}

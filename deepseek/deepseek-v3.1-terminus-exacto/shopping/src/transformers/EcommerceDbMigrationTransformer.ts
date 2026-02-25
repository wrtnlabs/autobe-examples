import { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceDbMigrationTransformer {
  export type Payload = Prisma.ecommerce_db_migrationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        migration_name: true,
        version: true,
        description: true,
        executed_at: true,
        execution_status: true,
        rollback_capable: true,
        rollback_executed_at: true,
        execution_duration_ms: true,
        error_message: true,
        dependencies: true,
        checksum: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        metadataRegistries: true,
      },
    } satisfies Prisma.ecommerce_db_migrationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceDbMigration> {
    return {
      id: input.id,
      migration_name: input.migration_name,
      version: input.version,
      description: input.description,
      executed_at: input.executed_at.toISOString(),
      execution_status: input.execution_status,
      rollback_capable: input.rollback_capable,
      rollback_executed_at: input.rollback_executed_at?.toISOString() ?? null,
      execution_duration_ms: input.execution_duration_ms ?? null,
      error_message: input.error_message ?? null,
      dependencies: input.dependencies ?? null,
      checksum: input.checksum,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}

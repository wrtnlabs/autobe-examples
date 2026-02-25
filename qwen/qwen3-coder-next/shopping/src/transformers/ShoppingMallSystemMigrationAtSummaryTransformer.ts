import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemMigration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemMigrationAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_system_migrationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        migration_name: true,
        executed_at: true,
        migration_hash: true,
        admin: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_adminsFindFirstArgs,
      },
    } satisfies Prisma.shopping_mall_system_migrationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemMigration.ISummary> {
    return {
      id: input.id,
      migration_name: input.migration_name,
      executed_at: input.executed_at.toISOString(),
      migration_hash: input.migration_hash,
      admin_id: input.admin.id,
    };
  }
}

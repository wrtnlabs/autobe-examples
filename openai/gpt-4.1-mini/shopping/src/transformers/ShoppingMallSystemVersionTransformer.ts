import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSystemVersionTransformer {
  export type Payload = Prisma.shopping_mall_system_versionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_name: true,
        entity_id: true,
        version_number: true,
        changed_fields: true,
        change_description: true,
        changed_by: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_system_versionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemVersion> {
    return {
      id: input.id,
      entityName: input.entity_name,
      entityId: input.entity_id,
      versionNumber: input.version_number,
      changedFields: input.changed_fields,
      changeDescription: input.change_description ?? null,
      changedBy: input.changed_by ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}

import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceProductVariantAtInventoryChangeTransformer {
  export type Payload = Prisma.ecommerce_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: true,
        seller: true,
        order: true,
        snapshots: true,
        modificationRestorations: true,
      },
    } satisfies Prisma.ecommerce_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductVariant.IInventoryChange> {
    return {
      quantity: input.quantity,
      reason: input.reason,
    };
  }
}

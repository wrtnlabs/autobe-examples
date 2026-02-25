import { IEcommerceVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantInventory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceVariantInventoryTransformer {
  export type Payload = Prisma.ecommerce_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: true,
        snapshots: true,
        inventories: {
          select: {
            quantity: true,
            reason: true,
          },
        } satisfies Prisma.ecommerce_variant_inventoriesFindManyArgs,
        options: true,
        orderItems: true,
        cartItems: true,
      },
    } satisfies Prisma.ecommerce_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceVariantInventory> {
    return {
      sku: input.sku_code,
      currentStock: input.inventories.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      ),
      adjustmentSummary: input.inventories.reduce(
        (acc, inv) => {
          acc[inv.reason] = (acc[inv.reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

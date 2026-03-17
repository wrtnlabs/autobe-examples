import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        recorded_at: true,
        current_stock: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: {
          select: {
            sku_code: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      recorded_at: input.recorded_at.toISOString(),
      current_stock: input.current_stock,
      variant_sku_code: input.productVariant.sku_code,
      product_name: input.productVariant.product.name,
    };
  }
}

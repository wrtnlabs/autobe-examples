import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "./EcommerceMallProductVariantOptionAtSummaryTransformer";

export namespace EcommerceMallInventoryRecordTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            created_at: true,
            deleted_at: true,
            variantOptions:
              EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord> {
    const currentStock = input.variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return {
      id: input.id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      variant: {
        id: input.variant.id,
        skuCode: input.variant.sku_code,
        price: input.variant.price ?? null,
        options: await ArrayUtil.asyncMap(
          input.variant.variantOptions,
          EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
        ),
        currentStock,
        isAvailable: currentStock > 0 && input.variant.deleted_at === null,
        createdAt: input.variant.created_at.toISOString(),
      } satisfies IEcommerceMallProductVariant.ISummary,
    };
  }
}

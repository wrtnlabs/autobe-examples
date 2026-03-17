import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "./EcommerceMallProductVariantOptionAtSummaryTransformer";

export namespace EcommerceMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        productVariant: {
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
        } satisfies Prisma.ecommerce_mall_product_variantsDefaultArgs,
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem.ISummary> {
    const currentStock = input.productVariant.inventoryRecords.reduce(
      (sum, record) => sum + (record as any).quantity_change,
      0,
    );
    const productVariant: IEcommerceMallProductVariant.ISummary = {
      id: input.productVariant.id,
      skuCode: input.productVariant.sku_code,
      price: input.productVariant.price ?? null,
      options: await ArrayUtil.asyncMap(
        input.productVariant.variantOptions,
        EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
      ),
      currentStock,
      isAvailable: currentStock > 0 && input.productVariant.deleted_at === null,
      createdAt: input.productVariant.created_at.toISOString(),
    };
    return {
      id: input.id,
      quantity: input.quantity,
      createdAt: input.created_at.toISOString(),
      productVariant,
      subtotal:
        productVariant.price !== null
          ? input.quantity * productVariant.price
          : undefined,
      isAvailable: productVariant.isAvailable,
    };
  }
}

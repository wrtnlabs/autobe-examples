import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "./EcommerceMallProductVariantOptionAtSummaryTransformer";

export namespace EcommerceMallCartItemTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
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
            product: EcommerceMallProductAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_product_variantsDefaultArgs,
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem> {
    const variant = input.productVariant;
    const currentStock = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    const productVariant: IEcommerceMallProductVariant.ISummary = {
      id: variant.id,
      skuCode: variant.sku_code,
      price: variant.price,
      options: await ArrayUtil.asyncMap(
        variant.variantOptions,
        EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
      ),
      currentStock,
      isAvailable: currentStock > 0 && variant.deleted_at === null,
      createdAt: variant.created_at.toISOString(),
    };
    const product = await EcommerceMallProductAtSummaryTransformer.transform(
      variant.product,
    );
    const unitPrice = productVariant.price ?? product.priceRangeMin;
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice,
      subtotal: unitPrice * input.quantity,
      isAvailable: productVariant.isAvailable && product.isAvailable,
      productVariant,
      product,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}

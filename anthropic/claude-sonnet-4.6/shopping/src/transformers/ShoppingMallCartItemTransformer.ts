import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallProductVariantOptionAtSummaryTransformer } from "./ShoppingMallProductVariantOptionAtSummaryTransformer";

export namespace ShoppingMallCartItemTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        availability_status: true,
        created_at: true,
        updated_at: true,
        productVariant: {
          select: {
            id: true,
            sku: true,
            price_override: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            options:
              ShoppingMallProductVariantOptionAtSummaryTransformer.select(),
            inventoryRecords: {
              select: {
                quantity: true,
              },
            } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
            product: {
              select: {
                base_price: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    const totalStock = input.productVariant.inventoryRecords.reduce(
      (sum, r) => sum + r.quantity,
      0,
    );
    const unitPrice =
      input.productVariant.price_override ??
      input.productVariant.product.base_price;
    const subtotal = unitPrice * input.quantity;
    const stockWarning = totalStock > 0 && totalStock < input.quantity;
    return {
      id: input.id,
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant as ShoppingMallProductVariantAtSummaryTransformer.Payload,
        ),
      quantity: input.quantity,
      unitPrice,
      subtotal,
      availabilityStatus: input.availability_status,
      stockWarning,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}

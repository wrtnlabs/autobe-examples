import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemVariantOptionTransformer } from "./ShoppingMallOrderItemVariantOptionTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        quantity: true,
        unit_price: true,
        product_name: true,
        product_thumbnail_url: true,
        product_category_name: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        created_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        variantOptions: ShoppingMallOrderItemVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      status: input.status,
      quantity: input.quantity,
      unit_price: input.unit_price,
      subtotal: input.quantity * input.unit_price,
      product_name: input.product_name,
      product_thumbnail_url: input.product_thumbnail_url,
      product_category_name: input.product_category_name,
      variant_sku_code: input.variant_sku_code,
      variant_price: input.variant_price,
      seller_shop_name: input.seller_shop_name,
      created_at: input.created_at.toISOString(),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      variant_options: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemVariantOptionTransformer.transform,
      ),
    };
  }
}

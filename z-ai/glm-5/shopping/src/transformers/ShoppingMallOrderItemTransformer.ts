import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemVariantOptionTransformer } from "./ShoppingMallOrderItemVariantOptionTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        product_category_name: true,
        product_base_price: true,
        product_thumbnail_url: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_url: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        variantOptions: ShoppingMallOrderItemVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      product: input.product
        ? await ShoppingMallProductAtSummaryTransformer.transform(input.product)
        : null,
      variant: input.variant
        ? await ShoppingMallProductVariantAtSummaryTransformer.transform(
            input.variant,
          )
        : null,
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemVariantOptionTransformer.transform,
      ),
      productName: input.product_name,
      productDescription: input.product_description,
      productCategoryName: input.product_category_name,
      productBasePrice: input.product_base_price,
      productThumbnailUrl: input.product_thumbnail_url,
      variantSkuCode: input.variant_sku_code,
      variantPrice: input.variant_price,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      sellerShopName: input.seller_shop_name,
      sellerShopDescription: input.seller_shop_description ?? null,
      sellerLogoUrl: input.seller_logo_url ?? null,
      quantity: input.quantity,
      unitPrice: input.unit_price,
      status: input.status as IShoppingMallOrderItem["status"],
      createdAt: input.created_at.toISOString(),
    };
  }
}

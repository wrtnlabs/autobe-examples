import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemSnapshotProductImageTransformer } from "./ShoppingMallOrderItemSnapshotProductImageTransformer";
import { ShoppingMallOrderItemSnapshotVariantOptionTransformer } from "./ShoppingMallOrderItemSnapshotVariantOptionTransformer";

export namespace ShoppingMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        product_category_id: true,
        product_category_name: true,
        product_base_price: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_shop_logo_uri: true,
        created_at: true,
        shopping_mall_order_item_id: true,
        productImages:
          ShoppingMallOrderItemSnapshotProductImageTransformer.select(),
        variantOptions:
          ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      product_name: input.product_name,
      product_description: input.product_description,
      product_category_id: input.product_category_id,
      product_category_name: input.product_category_name,
      product_base_price: input.product_base_price,
      variant_sku_code: input.variant_sku_code,
      variant_price: input.variant_price,
      seller_shop_name: input.seller_shop_name,
      seller_shop_description: input.seller_shop_description,
      seller_shop_logo_uri: input.seller_shop_logo_uri,
      created_at: input.created_at.toISOString(),
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform,
      ),
      productImages: await ArrayUtil.asyncMap(
        input.productImages,
        ShoppingMallOrderItemSnapshotProductImageTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             product_name: true,
//             product_description: true,
//             product_category_id: true,
//             product_category_name: true,
//             product_base_price: true,
//             variant_sku_code: true,
//             variant_price: true,
//             seller_shop_name: true,
//             seller_shop_description: true,
//             seller_shop_logo_uri: true,
//             created_at: true,
//             shopping_mall_order_item_id: true,
//             productImages: ShoppingMallOrderItemSnapshotProductImageTransformer.select(),
//             variantOptions: ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItemSnapshot> {
//         return {
//   id: {string},
//   product_name: {string},
//   product_description: {string},
//   product_category_id: {string},
//   product_category_name: {string},
//   product_base_price: {number},
//   variant_sku_code: {string},
//   variant_price: {number},
//   seller_shop_name: {string},
//   seller_shop_description: {string},
//   seller_shop_logo_uri: {string},
//   created_at: {string},
//   variantOptions: await ArrayUtil.asyncMap(input.variantOptions, ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform),
//   productImages: await ArrayUtil.asyncMap(input.productImages, ShoppingMallOrderItemSnapshotProductImageTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
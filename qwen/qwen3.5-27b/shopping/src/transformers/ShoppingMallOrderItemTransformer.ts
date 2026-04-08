import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemSnapshotProductImageTransformer } from "./ShoppingMallOrderItemSnapshotProductImageTransformer";
import { ShoppingMallOrderItemSnapshotVariantOptionTransformer } from "./ShoppingMallOrderItemSnapshotVariantOptionTransformer";
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
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        snapshot: {
          select: {
            product_name: true,
            product_description: true,
            variant_sku_code: true,
            variant_price: true,
            seller_shop_name: true,
            seller_shop_description: true,
            productImages:
              ShoppingMallOrderItemSnapshotProductImageTransformer.select(),
            variantOptions:
              ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      product_name: input.snapshot!.product_name,
      product_description: input.snapshot!.product_description,
      variant_sku_code: input.snapshot!.variant_sku_code,
      variant_price: input.snapshot!.variant_price,
      seller_shop_name: input.snapshot!.seller_shop_name,
      seller_shop_description: input.snapshot!.seller_shop_description,
      images: await ArrayUtil.asyncMap(
        input.snapshot!.productImages,
        ShoppingMallOrderItemSnapshotProductImageTransformer.transform,
      ),
      variantOptions: await ArrayUtil.asyncMap(
        input.snapshot!.variantOptions,
        ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallOrderItemTransformer {
//       export type Payload = Prisma.shopping_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product_name: true,
//             product_description: true,
//             variant_sku_code: true,
//             variant_price: true,
//             seller_shop_name: true,
//             seller_shop_description: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallOrderItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   price: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   order: {IShoppingMallOrder.ISummary},
//   productVariant: {IShoppingMallProductVariant.ISummary},
//   seller: {IShoppingMallSeller.ISummary},
//   product_name: {string},
//   product_description: {string},
//   variant_sku_code: {string},
//   variant_price: {number},
//   seller_shop_name: {string},
//   seller_shop_description: {string | null},
//   images: {Array<IShoppingMallOrderItemSnapshotProductImage>},
//   variantOptions: {Array<IShoppingMallOrderItemSnapshotVariantOption>},
//         };
//       }
//     }
//--------------------------------------------------------------
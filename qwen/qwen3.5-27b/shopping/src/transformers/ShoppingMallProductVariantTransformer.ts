import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantOptionTransformer } from "./ShoppingMallProductVariantOptionTransformer";

export namespace ShoppingMallProductVariantTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
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
        cartItems: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_customer_cart_itemsFindManyArgs,
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
        variantSnapshots: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_variant_snapshotsFindManyArgs,
        variantOptions: ShoppingMallProductVariantOptionTransformer.select(),
        orderItems: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallProductVariantOptionTransformer.transform,
      ),
      inventory_count: input.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantTransformer {
//       export type Payload = Prisma.shopping_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             shopping_mall_product_id: true,
//             variantOptions: ShoppingMallProductVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariant> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number | null},
//   options: await ArrayUtil.asyncMap(input.variantOptions, ShoppingMallProductVariantOptionTransformer.transform),
//   inventory_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
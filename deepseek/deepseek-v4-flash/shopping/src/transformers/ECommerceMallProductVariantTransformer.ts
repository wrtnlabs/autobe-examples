import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallProductVariantOptionTransformer } from "./ECommerceMallProductVariantOptionTransformer";

export namespace ECommerceMallProductVariantTransformer {
  export type Payload = Prisma.e_commerce_mall_product_variantsGetPayload<
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
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        } satisfies Prisma.e_commerce_mall_inventory_recordsFindManyArgs,
        options: ECommerceMallProductVariantOptionTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductVariant> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.options,
        ECommerceMallProductVariantOptionTransformer.transform,
      ),
      stock: input.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallProductVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductVariantTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
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
//             e_commerce_mall_product_id: true,
//             options: ECommerceMallProductVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductVariant> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number | null},
//   options: await ArrayUtil.asyncMap(input.options, ECommerceMallProductVariantOptionTransformer.transform),
//   stock: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantOptionValueTransformer } from "./EcommerceMallProductVariantOptionValueTransformer";

export namespace EcommerceMallProductVariantTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
          },
        },
        optionValues:
          EcommerceMallProductVariantOptionValueTransformer.select(),
        inventoryRecords: {
          select: {
            id: true,
          },
        },
        cartItems: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price ?? null,
      quantity: input.quantity,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductVariantOptionValueTransformer.transform,
      ),
    } satisfies IEcommerceMallProductVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_product_id: true,
//             optionValues: EcommerceMallProductVariantOptionValueTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant> {
//         return {
//   createdAt: {string},
//   deletedAt: {null | string},
//   id: {string},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, EcommerceMallProductVariantOptionValueTransformer.transform),
//   price: {null | number},
//   quantity: {integer},
//   skuCode: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
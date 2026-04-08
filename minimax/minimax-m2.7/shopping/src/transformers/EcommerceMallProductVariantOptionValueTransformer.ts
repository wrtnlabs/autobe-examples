import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantOptionValueTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        productVariant: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_variant_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantOptionValue> {
    return {
      key: input.key,
      value: input.value,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantOptionValueTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variant_option_valuesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             value: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_product_variant_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_option_valuesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantOptionValue> {
//         return {
//   key: {string},
//   value: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
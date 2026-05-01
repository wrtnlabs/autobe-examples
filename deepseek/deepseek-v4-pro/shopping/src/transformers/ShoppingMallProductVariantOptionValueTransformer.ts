import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantOptionValueTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_option_valuesGetPayload<
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
        variant: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantOptionValue> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantOptionValueTransformer {
//       export type Payload = Prisma.shopping_mall_product_variant_option_valuesGetPayload<ReturnType<typeof select>>;
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
//             shopping_mall_product_variant_id: true,
//           },
//         } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariantOptionValue> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
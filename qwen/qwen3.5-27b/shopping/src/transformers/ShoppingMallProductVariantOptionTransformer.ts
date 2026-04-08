import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantOptionTransformer {
  export type Payload = Prisma.shopping_mall_product_variant_optionsGetPayload<
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
        deleted_at: true,
        productVariant: true,
      },
    } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantOption> {
    return {
      key: input.key,
      value: input.value,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantOptionTransformer {
//       export type Payload = Prisma.shopping_mall_product_variant_optionsGetPayload<ReturnType<typeof select>>;
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
//             deleted_at: true,
//             shopping_mall_product_variant_id: true,
//           },
//         } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariantOption> {
//         return {
//   key: {string},
//   value: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
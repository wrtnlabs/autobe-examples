import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallProductVariantAtOptionTransformer {
  export type Payload =
    Prisma.e_commerce_mall_product_variant_optionsGetPayload<
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
        variant: {
          select: {
            id: true,
          },
        } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductVariant.IOption> {
    return {
      key: input.key,
      value: input.value,
    } satisfies IECommerceMallProductVariant.IOption;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductVariantAtOptionTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_variant_optionsGetPayload<ReturnType<typeof select>>;
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
//             e_commerce_mall_product_variant_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductVariant.IOption> {
//         return {
//   key: {string},
//   value: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
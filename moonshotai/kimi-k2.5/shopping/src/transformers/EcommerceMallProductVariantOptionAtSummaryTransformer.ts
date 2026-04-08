import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantOptionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variant_optionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
        created_at: true,
        updated_at: true,
        productVariant: true,
      },
    } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantOption.ISummary> {
    return {
      id: input.id,
      optionName: input.option_name,
      optionValue: input.option_value,
    } satisfies IEcommerceMallProductVariantOption.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantOptionAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variant_optionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             option_name: true,
//             option_value: true,
//             created_at: true,
//             updated_at: true,
//             product_variant_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantOption.ISummary> {
//         return {
//   id: {string},
//   optionName: {string},
//   optionValue: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
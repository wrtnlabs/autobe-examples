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
import { ECommerceMallProductVariantAtSummaryTransformer } from "./ECommerceMallProductVariantAtSummaryTransformer";

export namespace ECommerceMallProductVariantOptionTransformer {
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
        variant: ECommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductVariantOption> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductVariantOptionTransformer {
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
//             variant: ECommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductVariantOption> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   variant: await ECommerceMallProductVariantAtSummaryTransformer.transform(input.variant),
//         };
//       }
//     }
//--------------------------------------------------------------
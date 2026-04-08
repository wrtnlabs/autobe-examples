import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_snapshot_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
        created_at: true,
        productVariantSnapshot: {
          select: {},
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshotOptionValue.ISummary> {
    return {
      id: input.id,
      optionName: input.option_name,
      optionValue: input.option_value,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variant_snapshot_option_valuesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             option_name: true,
//             option_value: true,
//             created_at: true,
//             ecommerce_mall_product_variant_snapshot_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantSnapshotOptionValue.ISummary> {
//         return {
//   id: {string},
//   optionName: {string},
//   optionValue: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
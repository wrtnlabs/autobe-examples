import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer } from "./EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer";

export namespace EcommerceMallProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues:
          EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price,
      createdAt: input.created_at.toISOString(),
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variant_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             product_variant_id: true,
//             optionValues: EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariantSnapshot.ISummary> {
//         return {
//   id: {string},
//   skuCode: {string},
//   price: {number},
//   createdAt: {string},
//   optionValues: await ArrayUtil.asyncMap(input.optionValues, EcommerceMallProductVariantSnapshotOptionValueAtSummaryTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
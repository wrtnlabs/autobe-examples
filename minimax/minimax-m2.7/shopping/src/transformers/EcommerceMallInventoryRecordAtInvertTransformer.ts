import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallInventoryRecordAtInvertTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventoryRecord.IInvert> {
    return {
      id: input.id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      currentStock: input.productVariant.quantity,
      variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
    } satisfies IEcommerceMallInventoryRecord.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallInventoryRecordAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity_change: true,
//             reason: true,
//             created_at: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallInventoryRecord.IInvert> {
//         return {
//   id: {string},
//   quantityChange: {integer},
//   reason: {string},
//   createdAt: {string},
//   currentStock: {integer},
//   variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------
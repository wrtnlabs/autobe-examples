import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerSuspensionAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        restored_reason: true,
        suspended_at: true,
        restored_at: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        suspendedBy: EcommerceMallAdminAtSummaryTransformer.select(),
        restoredBy: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSuspension.IInvert> {
    return {
      id: input.id,
      reason: input.reason,
      restored_reason: input.restored_reason,
      suspended_at: input.suspended_at.toISOString(),
      restored_at: input.restored_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      suspendedBy: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.suspendedBy,
      ),
      restoredBy: input.restoredBy
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.restoredBy,
          )
        : undefined,
    } satisfies IEcommerceMallSellerSuspension.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSuspensionAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_suspensionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             restored_reason: true,
//             suspended_at: true,
//             restored_at: true,
//             created_at: true,
//             updated_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             suspended_by_id: true,
//             restored_by_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSuspension.IInvert> {
//         return {
//   id: {string},
//   reason: {string},
//   restored_reason: {string | null},
//   suspended_at: {string},
//   restored_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   suspendedBy: {IEcommerceMallAdmin.ISummary},
//   restoredBy: {IEcommerceMallAdmin.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------
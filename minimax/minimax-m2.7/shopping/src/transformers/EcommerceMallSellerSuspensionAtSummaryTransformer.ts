import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerSuspensionAtSummaryTransformer {
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
  ): Promise<IEcommerceMallSellerSuspension.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      suspended_at: input.suspended_at.toISOString(),
      restored_at: input.restored_at?.toISOString() ?? null,
      restored_reason: input.restored_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      suspended_by: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.suspendedBy,
      ),
      restored_by: input.restoredBy
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.restoredBy,
          )
        : undefined,
    } satisfies IEcommerceMallSellerSuspension.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSuspensionAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSuspension.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   suspended_at: {string},
//   restored_at: {string | null},
//   restored_reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   suspended_by: {IEcommerceMallAdmin.ISummary},
//   restored_by: {IEcommerceMallAdmin.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------
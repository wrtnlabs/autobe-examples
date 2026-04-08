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

export namespace EcommerceMallSellerSuspensionTransformer {
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
  ): Promise<IEcommerceMallSellerSuspension> {
    return {
      id: input.id,
      reason: input.reason,
      restoredReason: input.restored_reason ?? null,
      suspendedAt: input.suspended_at.toISOString(),
      restoredAt: input.restored_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
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
        : null,
    } satisfies IEcommerceMallSellerSuspension;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSuspensionTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSuspension> {
//         return {
//   id: {string},
//   reason: {string},
//   restoredReason: {string | null},
//   suspendedAt: {string},
//   restoredAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   suspendedBy: {IEcommerceMallAdmin.ISummary},
//   restoredBy: {IEcommerceMallAdmin.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------
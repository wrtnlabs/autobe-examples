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

export namespace EcommerceMallSellerSuspensionTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_seller_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
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
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSuspension> {
    return {
      createdAt: input.created_at.toISOString(),
      id: input.id,
      reason: input.reason,
      restoredAt: input.restored_at?.toISOString() ?? null,
      restoredBy: input.restoredBy
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.restoredBy,
          )
        : null,
      restoredReason: input.restored_reason ?? null,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      suspendedAt: input.suspended_at.toISOString(),
      suspendedBy: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.suspendedBy,
      ),
      updatedAt: input.updated_at.toISOString(),
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
//   createdAt: {string},
//   id: {string},
//   reason: {string},
//   restoredAt: {string | null},
//   restoredBy: {IEcommerceMallAdmin.ISummary | null},
//   restoredReason: {null | string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   suspendedAt: {string},
//   suspendedBy: {IEcommerceMallAdmin.ISummary},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
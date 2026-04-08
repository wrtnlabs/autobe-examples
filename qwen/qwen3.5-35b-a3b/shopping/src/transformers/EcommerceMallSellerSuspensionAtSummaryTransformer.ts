import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";

export namespace EcommerceMallSellerSuspensionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        suspended_at: true,
        resolved_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
        suspendedByAdmin:
          EcommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSuspension.ISummary> {
    return {
      id: input.id,
      seller_id: input.seller.id,
      suspended_by_admin_id: input.suspendedByAdmin.id,
      suspended_at: input.suspended_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? null,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      suspendedByAdmin:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.suspendedByAdmin,
        ),
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
//             suspended_at: true,
//             resolved_at: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller_id: true,
//             suspendedByAdmin: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSuspension.ISummary> {
//         return {
//   id: {string},
//   seller_id: {string},
//   suspended_by_admin_id: {string},
//   suspended_at: {string},
//   resolved_at: {string | null},
//   reason: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   suspendedByAdmin: await EcommerceMallAdministratorAtSummaryTransformer.transform(input.suspendedByAdmin),
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        approval_status: true,
        rejection_reason: true,
        is_suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      approval_status: input.approval_status,
      is_suspended: input.is_suspended,
      created_at: input.created_at.toISOString(),
      email: input.email ?? undefined,
      rejection_reason: input.rejection_reason ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      updated_at: input.updated_at?.toISOString() ?? undefined,
    } satisfies IEcommerceMallSeller.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             approval_status: true,
//             rejection_reason: true,
//             is_suspended: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.ISummary> {
//         return {
//   id: {string},
//   display_name: {string},
//   approval_status: {string},
//   is_suspended: {boolean},
//   created_at: {string},
//   email: {string},
//   rejection_reason: {string | null},
//   deleted_at: {string | null},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
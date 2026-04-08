import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerSuspensionAtRestoreTransformer {
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
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        suspendedBy: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
        restoredBy: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSuspension.IRestore> {
    return {
      restoredReason: input.restored_reason,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSuspensionAtRestoreTransformer {
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
//             ecommerce_mall_seller_id: true,
//             suspended_by_id: true,
//             restored_by_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSuspension.IRestore> {
//         return {
//   restoredReason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
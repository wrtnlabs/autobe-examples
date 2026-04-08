import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtApproveTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        approval_reason: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.IApprove> {
    return {
      approval_reason: input.approval_reason ?? undefined,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerAtApproveTransformer {
//       export type Payload = Prisma.shopping_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             approval_reason: true,
//             rejection_reason: true,
//             suspended: true,
//             banned: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.shopping_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSeller.IApprove> {
//         return {
//   approval_reason: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerProfileTransformer } from "./ShoppingMallSellerProfileTransformer";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        approval_reason: true,
        rejection_reason: true,
        suspended: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerProfile: ShoppingMallSellerProfileTransformer.select(),
        sessions: true,
        passwordResets: true,
        products: true,
        orderItems: true,
        shipments: true,
        requestSnapshots: true,
        cancellationRequestSnapshots: true,
        refundRequests: true,
        refundRequestSnapshots: true,
        administratorRequests: true,
        promotionRequests: true,
        productSnapshots: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      approval_reason: input.approval_reason ?? null,
      rejection_reason: input.rejection_reason ?? null,
      suspended: input.suspended,
      banned: input.banned,
      created_at: toISOStringSafe(input.created_at),
      seller_profile: typia.assert<IShoppingMallSellerProfile>(
        await ShoppingMallSellerProfileTransformer.transform(
          input.sellerProfile!,
        ),
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             approval_status: true,
//             approval_reason: true,
//             rejection_reason: true,
//             suspended: true,
//             banned: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   approval_reason: {string | null},
//   rejection_reason: {string | null},
//   suspended: {boolean},
//   banned: {boolean},
//   created_at: {string},
//   seller_profile: {IShoppingMallSellerProfile},
//         };
//       }
//     }
//--------------------------------------------------------------
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
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        suspended_at: true,
        banned_at: true,
        created_at: true,
        profile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    if (!input.profile) throw new Error("Seller profile not found");
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      suspended: input.suspended_at !== null,
      banned: input.banned_at !== null,
      created_at: input.created_at.toISOString(),
      profile: await ShoppingMallSellerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
    } satisfies IShoppingMallSeller.ISummary;
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
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             suspended_at: true,
//             banned_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             profile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approval_status: {string},
//   suspended: {boolean},
//   banned: {boolean},
//   created_at: {string},
//   profile: await ShoppingMallSellerProfileAtSummaryTransformer.transform(input.profile),
//         };
//       }
//     }
//--------------------------------------------------------------
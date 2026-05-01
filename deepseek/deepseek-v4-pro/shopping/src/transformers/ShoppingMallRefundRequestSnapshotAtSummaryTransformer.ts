import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallRefundRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        refundRequest: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallRefundRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRefundRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             shopping_mall_refund_request_id: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
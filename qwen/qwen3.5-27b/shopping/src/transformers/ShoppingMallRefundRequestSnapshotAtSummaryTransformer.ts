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
        status_before: true,
        status_after: true,
        response_text: true,
        created_at: true,
        refundRequest: { select: { id: true } },
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        customerSession: { select: { id: true } },
      },
    } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      refund_request_id: input.refundRequest.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      status_before: input.status_before,
      status_after: input.status_after,
      response_text: input.response_text,
      created_at: input.created_at.toISOString(),
    };
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
//             status_before: true,
//             status_after: true,
//             response_text: true,
//             created_at: true,
//             shopping_mall_refund_request_id: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//             shopping_mall_customer_session_id: true,
//           },
//         } satisfies Prisma.shopping_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   refund_request_id: {string},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   status_before: {string},
//   status_after: {string},
//   response_text: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
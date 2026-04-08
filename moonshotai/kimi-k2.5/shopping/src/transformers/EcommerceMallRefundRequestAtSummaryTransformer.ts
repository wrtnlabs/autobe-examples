import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order_item_id: true,
        customer_id: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      requestedAt: input.requested_at.toISOString(),
      respondedAt: input.responded_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      orderItemId: input.order_item_id,
      customer: {
        id: input.customer_id,
      } satisfies IEcommerceMallCustomer.ISummary,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             requested_at: true,
//             responded_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             order_item_id: true,
//             customer_id: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   requestedAt: {string},
//   respondedAt: {string | null},
//   createdAt: {string},
//   orderItemId: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------
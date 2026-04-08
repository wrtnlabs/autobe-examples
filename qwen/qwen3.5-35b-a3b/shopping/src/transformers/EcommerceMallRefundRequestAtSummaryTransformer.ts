import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        item: EcommerceMallOrderItemAtSummaryTransformer.select(),
        approvedBySeller: EcommerceMallSellerAtSummaryTransformer.select(),
        rejectedBySeller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: true,
        snapshot: true,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      item: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.item,
      ),
      approvedBySeller: input.approvedBySeller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(
            input.approvedBySeller,
          )
        : null,
      rejectedBySeller: input.rejectedBySeller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(
            input.rejectedBySeller,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallRefundRequest.ISummary;
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
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             item: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             approved_by_seller_id: true,
//             rejected_by_seller_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   item: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.item),
//   approvedBySeller: {IEcommerceMallSeller.ISummary | null},
//   rejectedBySeller: {IEcommerceMallSeller.ISummary | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";

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
        seller_response_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: { select: { id: true } },
        refundRequestSnapshots: {
          select: { id: true },
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
      status: input.status,
      sellerResponseAt: input.seller_response_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
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
//             seller_response_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             ecommerce_mall_seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest.ISummary> {
//         return {
//   createdAt: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   id: {string},
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   reason: {string},
//   sellerResponseAt: {null | string},
//   status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
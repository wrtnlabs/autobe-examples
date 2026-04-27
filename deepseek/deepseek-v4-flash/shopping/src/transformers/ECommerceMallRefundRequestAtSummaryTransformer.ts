import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        response_timestamp: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        _count: {
          select: {
            refundRequestSnapshots: true,
          },
        },
      },
    } satisfies Prisma.e_commerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      response_timestamp: input.response_timestamp?.toISOString() ?? null,
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      snapshots_count: input._count.refundRequestSnapshots,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallRefundRequestAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             response_timestamp: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallRefundRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   response_timestamp: {string | null},
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   snapshots_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
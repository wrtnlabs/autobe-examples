import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
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
import { ECommerceMallRefundRequestSnapshotTransformer } from "./ECommerceMallRefundRequestSnapshotTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallRefundRequestTransformer {
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
        refundRequestSnapshots:
          ECommerceMallRefundRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallRefundRequest> {
    return {
      id: input.id,
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reason: input.reason,
      status: input.status,
      response_timestamp: input.response_timestamp?.toISOString() ?? null,
      refundRequestSnapshots: await ArrayUtil.asyncMap(
        input.refundRequestSnapshots,
        ECommerceMallRefundRequestSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallRefundRequestTransformer {
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
//             refundRequestSnapshots: ECommerceMallRefundRequestSnapshotTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallRefundRequest> {
//         return {
//   id: {string},
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   reason: {string},
//   status: {string},
//   response_timestamp: {string | null},
//   refundRequestSnapshots: await ArrayUtil.asyncMap(input.refundRequestSnapshots, ECommerceMallRefundRequestSnapshotTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
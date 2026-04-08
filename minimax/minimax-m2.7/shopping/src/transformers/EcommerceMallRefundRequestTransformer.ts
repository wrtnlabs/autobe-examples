import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemTransformer } from "./EcommerceMallOrderItemTransformer";
import { EcommerceMallRefundRequestSnapshotTransformer } from "./EcommerceMallRefundRequestSnapshotTransformer";
import { EcommerceMallSellerTransformer } from "./EcommerceMallSellerTransformer";

export namespace EcommerceMallRefundRequestTransformer {
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
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemTransformer.select(),
        seller: EcommerceMallSellerTransformer.select(),
        refundRequestSnapshots:
          EcommerceMallRefundRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest> {
    // Transform customer relation (required when selected, even though not exposed in DTO)
    await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer);
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      sellerResponseAt: input.seller_response_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      orderItem: await EcommerceMallOrderItemTransformer.transform(
        input.orderItem,
      ),
      seller: await EcommerceMallSellerTransformer.transform(input.seller),
      snapshots: await ArrayUtil.asyncMap(
        input.refundRequestSnapshots,
        EcommerceMallRefundRequestSnapshotTransformer.transform,
      ),
    } satisfies IEcommerceMallRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestTransformer {
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
//             orderItem: EcommerceMallOrderItemTransformer.select(),
//             ecommerce_mall_customer_id: true,
//             ecommerce_mall_seller_id: true,
//             refundRequestSnapshots: EcommerceMallRefundRequestSnapshotTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   sellerResponseAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   orderItem: await EcommerceMallOrderItemTransformer.transform(input.orderItem),
//   seller: {IEcommerceMallSeller},
//   snapshots: await ArrayUtil.asyncMap(input.refundRequestSnapshots, EcommerceMallRefundRequestSnapshotTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
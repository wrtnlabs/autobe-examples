import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
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
import { ECommerceMallCancellationRequestSnapshotTransformer } from "./ECommerceMallCancellationRequestSnapshotTransformer";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallCancellationRequestTransformer {
  export type Payload = Prisma.e_commerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        rejection_reason: true,
        status: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        e_commerce_mall_customer_session_id: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        e_commerce_mall_seller_session_id: true,
        snapshots: ECommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCancellationRequest> {
    return {
      id: input.id,
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: input.seller
        ? await ECommerceMallSellerAtSummaryTransformer.transform(input.seller)
        : undefined,
      reason: input.reason,
      rejection_reason: input.rejection_reason ?? undefined,
      status: input.status,
      responded_at: input.responded_at?.toISOString() ?? undefined,
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        ECommerceMallCancellationRequestSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCancellationRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCancellationRequestTransformer {
//       export type Payload = Prisma.e_commerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             rejection_reason: true,
//             status: true,
//             responded_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             e_commerce_mall_customer_session_id: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//             e_commerce_mall_seller_session_id: true,
//             snapshots: ECommerceMallCancellationRequestSnapshotTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCancellationRequest> {
//         return {
//   id: {string},
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: input.seller ? await ECommerceMallSellerAtSummaryTransformer.transform(input.seller) : null,
//   reason: {string},
//   rejection_reason: {string | null},
//   status: {string},
//   responded_at: {string | null},
//   snapshots: await ArrayUtil.asyncMap(input.snapshots, ECommerceMallCancellationRequestSnapshotTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
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
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallOrderItemAtSummaryTransformer } from "./ECommerceMallOrderItemAtSummaryTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallCancellationRequestAtSummaryTransformer {
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
        orderItem: ECommerceMallOrderItemAtSummaryTransformer.select(),
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCancellationRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      rejection_reason: input.rejection_reason ?? null,
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      seller: input.seller
        ? await ECommerceMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
    } satisfies IECommerceMallCancellationRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCancellationRequestAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.e_commerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   reason: {string},
//   rejection_reason: {string | null},
//   responded_at: {string | null},
//   created_at: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   orderItem: await ECommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   seller: input.seller ? await ECommerceMallSellerAtSummaryTransformer.transform(input.seller) : null,
//         };
//       }
//     }
//--------------------------------------------------------------
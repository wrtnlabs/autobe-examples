import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      reason: input.reason,
      status: input.status,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    } satisfies IEcommerceMallCancellationRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
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
//             ecommerce_mall_order_item_id: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   reason: {string},
//   status: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------
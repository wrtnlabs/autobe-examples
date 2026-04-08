import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "./EcommerceMallCancellationRequestAtSummaryTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
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
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots:
          EcommerceMallCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest.IInvert> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      snapshots: await ArrayUtil.asyncMap(input.snapshots, (snapshot) =>
        EcommerceMallCancellationRequestAtSummaryTransformer.transform(
          snapshot,
        ),
      ),
    } satisfies IEcommerceMallCancellationRequest.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             createdAt: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequest.IInvert> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   createdAt: {string},
//   updatedAt: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   seller: {IEcommerceMallSeller.ISummary},
//   orderItem: {IEcommerceMallOrderItem.ISummary},
//   snapshots: {Array<IEcommerceMallCancellationRequest.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------
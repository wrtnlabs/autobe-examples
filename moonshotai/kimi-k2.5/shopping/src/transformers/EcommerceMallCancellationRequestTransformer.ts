import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestSnapshotTransformer } from "./EcommerceMallCancellationRequestSnapshotTransformer";
import { EcommerceMallOrderItemTransformer } from "./EcommerceMallOrderItemTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        response_reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: EcommerceMallOrderItemTransformer.select(),
        customer: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: EcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      responseReason: input.response_reason,
      respondedAt: input.responded_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      orderItem: await EcommerceMallOrderItemTransformer.transform(
        input.orderItem,
      ),
      customer: {
        id: input.customer.id,
        email: input.customer.email,
      } satisfies IEcommerceMallCustomer.ISummary,
      seller: input.seller
        ? await EcommerceMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        EcommerceMallCancellationRequestSnapshotTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             response_reason: true,
//             responded_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: EcommerceMallOrderItemTransformer.select(),
//             customer_id: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             snapshots: EcommerceMallCancellationRequestSnapshotTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   responseReason: {string | null},
//   respondedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   orderItem: await EcommerceMallOrderItemTransformer.transform(input.orderItem),
//   customer: {IEcommerceMallCustomer.ISummary},
//   seller: input.seller ? await EcommerceMallSellerAtSummaryTransformer.transform(input.seller) : null,
//   snapshots: await ArrayUtil.asyncMap(input.snapshots, EcommerceMallCancellationRequestSnapshotTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------
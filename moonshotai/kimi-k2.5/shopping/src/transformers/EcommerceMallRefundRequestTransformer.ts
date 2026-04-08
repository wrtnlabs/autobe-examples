import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemTransformer } from "./EcommerceMallOrderItemTransformer";
import { EcommerceMallRefundRequestSnapshotTransformer } from "./EcommerceMallRefundRequestSnapshotTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

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
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: EcommerceMallOrderItemTransformer.select(),
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        snapshots: EcommerceMallRefundRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      requestedAt: toISOStringSafe(input.requested_at),
      respondedAt: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      orderItem: await EcommerceMallOrderItemTransformer.transform(
        input.orderItem,
      ),
      customer: {
        id: input.customer.id,
        email: input.customer.email,
        createdAt: toISOStringSafe(input.customer.created_at),
      } satisfies IEcommerceMallCustomer.ISummary,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
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
//             requestedAt: true,
//             respondedAt: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {"pending" | "approved" | "rejected"},
//   requestedAt: {string},
//   respondedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   orderItem: {IEcommerceMallOrderItem},
//   customer: {IEcommerceMallCustomer.ISummary},
//   seller: {IEcommerceMallSeller.ISummary},
//   snapshots: {Array<IEcommerceMallRefundRequestSnapshot>},
//         };
//       }
//     }
//--------------------------------------------------------------
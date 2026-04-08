import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        snapshot_status: true,
        seller_response: true,
        seller_response_reason: true,
        created_at: true,
        updated_at: true,
        refundRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      snapshotReason: input.snapshot_reason,
      snapshotStatus: input.snapshot_status,
      sellerResponse: input.seller_response,
      sellerResponseReason: input.seller_response_reason ?? null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallRefundRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_reason: true,
//             snapshot_status: true,
//             seller_response: true,
//             seller_response_reason: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_mall_refund_request_id: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequestSnapshot> {
//         return {
//   id: {string},
//   snapshotReason: {string},
//   snapshotStatus: {string},
//   sellerResponse: {string},
//   sellerResponseReason: {string | null},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
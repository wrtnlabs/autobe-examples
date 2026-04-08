import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "./EcommerceMallRefundRequestAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallRefundRequestAtInvertTransformer {
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
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        refundRequest: EcommerceMallRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest.IInvert> {
    return {
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      createdAt: input.created_at.toISOString(),
      id: input.id,
      refundRequest:
        await EcommerceMallRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      sellerResponse: input.seller_response,
      sellerResponseReason: input.seller_response_reason,
      sellerResponseAt: input.created_at.toISOString(),
      snapshotReason: input.snapshot_reason,
      snapshotStatus: input.snapshot_status,
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallRefundRequest.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallRefundRequestAtInvertTransformer {
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
//             refundRequest: EcommerceMallRefundRequestAtSummaryTransformer.select(),
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequest.IInvert> {
//         return {
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   createdAt: {string},
//   id: {string},
//   refundRequest: await EcommerceMallRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   sellerResponse: {string},
//   sellerResponseReason: {null | string},
//   sellerResponseAt: {string},
//   snapshotReason: {string},
//   snapshotStatus: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
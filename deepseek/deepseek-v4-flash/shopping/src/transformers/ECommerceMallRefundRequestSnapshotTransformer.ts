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
import { ECommerceMallRefundRequestAtSummaryTransformer } from "./ECommerceMallRefundRequestAtSummaryTransformer";

export namespace ECommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.e_commerce_mall_refund_request_snapshotsGetPayload<
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
        refundRequest: ECommerceMallRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequest:
        await ECommerceMallRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      reason: input.reason,
      status: input.status,
      response_timestamp: input.response_timestamp.toISOString(),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallRefundRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallRefundRequestSnapshotTransformer {
//       export type Payload = Prisma.e_commerce_mall_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
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
//             refundRequest: ECommerceMallRefundRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallRefundRequestSnapshot> {
//         return {
//   id: {string},
//   refundRequest: await ECommerceMallRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//   reason: {string},
//   status: {string},
//   response_timestamp: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
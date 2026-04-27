import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallRefundRequestSnapshotAtSummaryTransformer {
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
      },
    } satisfies Prisma.e_commerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      response_timestamp: input.response_timestamp.toISOString(),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallRefundRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallRefundRequestSnapshotAtSummaryTransformer {
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
//             e_commerce_mall_refund_request_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallRefundRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   response_timestamp: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
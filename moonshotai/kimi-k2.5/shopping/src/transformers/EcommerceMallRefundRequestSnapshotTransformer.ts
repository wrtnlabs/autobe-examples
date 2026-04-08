import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        refundRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        reason: true,
        status: true,
        response_reason: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequestId: input.refundRequest.id,
      reason: input.reason ?? null,
      status: input.status ?? null,
      responseReason: input.response_reason ?? null,
      createdAt: input.created_at.toISOString(),
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
//             reason: true,
//             status: true,
//             response_reason: true,
//             created_at: true,
//             refund_request_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallRefundRequestSnapshot> {
//         return {
//   id: {string},
//   refundRequestId: {string},
//   reason: {string | null},
//   status: {string | null},
//   responseReason: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
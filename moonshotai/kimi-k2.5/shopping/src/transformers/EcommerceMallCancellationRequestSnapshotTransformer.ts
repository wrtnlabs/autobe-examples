import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCancellationRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        cancellation_request_id: true,
        status_before: true,
        status_after: true,
        reason_before: true,
        reason_after: true,
        reviewer_note: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot> {
    return {
      id: input.id,
      cancellationRequestId: input.cancellation_request_id,
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      reasonBefore: input.reason_before,
      reasonAfter: input.reason_after,
      reviewerNote: input.reviewer_note,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallCancellationRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status_before: true,
//             status_after: true,
//             reason_before: true,
//             reason_after: true,
//             reviewer_note: true,
//             created_at: true,
//             cancellation_request_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequestSnapshot> {
//         return {
//   id: {string},
//   cancellationRequestId: {string},
//   statusBefore: {string},
//   statusAfter: {string},
//   reasonBefore: {string | null},
//   reasonAfter: {string | null},
//   reviewerNote: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
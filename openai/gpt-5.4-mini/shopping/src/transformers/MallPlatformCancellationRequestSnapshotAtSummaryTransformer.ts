import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.mall_platform_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_status: true,
        review_result: true,
        reason: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cancellationRequest: {
          select: {},
        },
      },
    } satisfies Prisma.mall_platform_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      cancellationRequest:
        input.cancellationRequest as IMallPlatformCancellationRequest.ISummary,
      snapshotStatus: input.snapshot_status,
      reviewResult: input.review_result ?? null,
      reason: input.reason ?? null,
      changedAt: input.changed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCancellationRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCancellationRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_status: true,
//             review_result: true,
//             reason: true,
//             changed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             mall_platform_cancellation_request_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCancellationRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   cancellationRequest: {IMallPlatformCancellationRequest.ISummary},
//   snapshotStatus: {string},
//   reviewResult: {string | null},
//   reason: {string | null},
//   changedAt: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
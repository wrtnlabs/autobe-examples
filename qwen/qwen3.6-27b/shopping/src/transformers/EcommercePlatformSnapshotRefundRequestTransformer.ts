import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformSnapshotRefundRequestTransformer {
  export type Payload =
    Prisma.ecommerce_platform_snapshot_refund_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_reason: true,
        current_reason: true,
        previous_approval_status: true,
        current_approval_status: true,
        created_at: true,
        snapshot: {
          select: {
            id: true,
          },
        },
        refundRequest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotRefundRequest> {
    return {
      id: input.id,
      ecommerce_platform_snapshots_id: input.snapshot.id,
      ecommerce_platform_refund_requests_id: input.refundRequest.id,
      previous_reason: input.previous_reason,
      current_reason: input.current_reason,
      previous_approval_status: input.previous_approval_status,
      current_approval_status: input.current_approval_status,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotRefundRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotRefundRequestTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_reason: true,
//             current_reason: true,
//             previous_approval_status: true,
//             current_approval_status: true,
//             created_at: true,
//             ecommerce_platform_snapshots_id: true,
//             ecommerce_platform_refund_requests_id: true,
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotRefundRequest> {
//         return {
//   id: {string},
//   ecommerce_platform_snapshots_id: {string},
//   ecommerce_platform_refund_requests_id: {string},
//   previous_reason: {string | null},
//   current_reason: {string | null},
//   previous_approval_status: {string | null},
//   current_approval_status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
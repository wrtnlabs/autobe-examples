import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformRefundRequestAtSummaryTransformer } from "./EcommercePlatformRefundRequestAtSummaryTransformer";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "./EcommercePlatformSnapshotAtSummaryTransformer";

export namespace EcommercePlatformSnapshotRefundRequestAtSummaryTransformer {
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
        snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
        refundRequest:
          EcommercePlatformRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotRefundRequest.ISummary> {
    return {
      id: input.id,
      previous_reason: input.previous_reason,
      current_reason: input.current_reason,
      previous_approval_status: input.previous_approval_status,
      current_approval_status: input.current_approval_status,
      created_at: input.created_at.toISOString(),
      snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
      refundRequest:
        await EcommercePlatformRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotRefundRequestAtSummaryTransformer {
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
//             snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
//             refundRequest: EcommercePlatformRefundRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotRefundRequest.ISummary> {
//         return {
//   id: {string},
//   previous_reason: {string | null},
//   current_reason: {string | null},
//   previous_approval_status: {string | null},
//   current_approval_status: {string},
//   created_at: {string},
//   snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(input.snapshot),
//   refundRequest: await EcommercePlatformRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//         };
//       }
//     }
//--------------------------------------------------------------
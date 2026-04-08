import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformRefundRequestAtSummaryTransformer } from "./MallPlatformRefundRequestAtSummaryTransformer";

export namespace MallPlatformRefundRequestSnapshotTransformer {
  export type Payload = Prisma.mall_platform_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        status_before: true,
        status_after: true,
        reviewer_role: true,
        reviewer_note: true,
        created_at: true,
        refundRequest: MallPlatformRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformRefundRequestSnapshot> {
    return {
      id: input.id,
      refundRequest:
        await MallPlatformRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      snapshotReason: input.snapshot_reason,
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      reviewerRole: input.reviewer_role ?? null,
      reviewerNote: input.reviewer_note ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformRefundRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformRefundRequestSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_refund_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_reason: true,
//             status_before: true,
//             status_after: true,
//             reviewer_role: true,
//             reviewer_note: true,
//             created_at: true,
//             refundRequest: MallPlatformRefundRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_refund_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformRefundRequestSnapshot> {
//         return {
//   id: {string},
//   refundRequest: await MallPlatformRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//   snapshotReason: {string},
//   statusBefore: {string},
//   statusAfter: {string},
//   reviewerRole: {string | null},
//   reviewerNote: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
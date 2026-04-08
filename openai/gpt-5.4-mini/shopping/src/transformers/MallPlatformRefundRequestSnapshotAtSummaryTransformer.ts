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

export namespace MallPlatformRefundRequestSnapshotAtSummaryTransformer {
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
  ): Promise<IMallPlatformRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      refundRequest:
        await MallPlatformRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
      snapshot_reason: input.snapshot_reason,
      status_before: input.status_before,
      status_after: input.status_after,
      reviewer_role: input.reviewer_role,
      reviewer_note: input.reviewer_note,
      created_at: input.created_at.toISOString(),
    } satisfies IMallPlatformRefundRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformRefundRequestSnapshotAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformRefundRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   refundRequest: await MallPlatformRefundRequestAtSummaryTransformer.transform(input.refundRequest),
//   snapshot_reason: {string},
//   status_before: {string},
//   status_after: {string},
//   reviewer_role: {string | null},
//   reviewer_note: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
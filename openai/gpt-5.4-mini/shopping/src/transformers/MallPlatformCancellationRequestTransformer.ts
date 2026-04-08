import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";

export namespace MallPlatformCancellationRequestTransformer {
  export type Payload = Prisma.mall_platform_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_result: true,
        reviewer_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
        reviewer: {
          select: {
            id: true,
          },
        },
        snapshots: {
          select: {},
        },
      },
    } satisfies Prisma.mall_platform_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCancellationRequest> {
    return {
      id: input.id,
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      reviewer:
        input.reviewer === null
          ? null
          : ({ id: input.reviewer.id } as IMallPlatformAdministrator.ISummary),
      reason: input.reason,
      status: input.status,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      reviewResult: input.review_result,
      reviewerNote: input.reviewer_note,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformCancellationRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformCancellationRequestTransformer {
//       export type Payload = Prisma.mall_platform_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             reviewed_at: true,
//             review_result: true,
//             reviewer_note: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
//             reviewer_id: true,
//             ...
//           },
//         } satisfies Prisma.mall_platform_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformCancellationRequest> {
//         return {
//   id: {string},
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   reviewer: {IMallPlatformAdministrator.ISummary | null},
//   reason: {string},
//   status: {string},
//   reviewedAt: {string | null},
//   reviewResult: {string | null},
//   reviewerNote: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
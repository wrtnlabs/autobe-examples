import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformReviewAtSummaryTransformer } from "./MallPlatformReviewAtSummaryTransformer";

export namespace MallPlatformReviewSnapshotAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_action: true,
        rating: true,
        content: true,
        is_deleted: true,
        created_at: true,
        review: MallPlatformReviewAtSummaryTransformer.select(),
        customer: MallPlatformCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformReviewSnapshot.ISummary> {
    return {
      id: input.id,
      snapshotAction: input.snapshot_action,
      rating: input.rating,
      content: input.content,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
      review: await MallPlatformReviewAtSummaryTransformer.transform(
        input.review,
      ),
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IMallPlatformReviewSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformReviewSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_action: true,
//             rating: true,
//             content: true,
//             is_deleted: true,
//             created_at: true,
//             review: MallPlatformReviewAtSummaryTransformer.select(),
//             customer: MallPlatformCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformReviewSnapshot.ISummary> {
//         return {
//   id: {string},
//   snapshotAction: {string},
//   rating: {integer},
//   content: {string | null},
//   isDeleted: {boolean},
//   createdAt: {string},
//   review: await MallPlatformReviewAtSummaryTransformer.transform(input.review),
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------
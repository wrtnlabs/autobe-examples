import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCustomerAtSummaryTransformer } from "./MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformReviewAtSummaryTransformer } from "./MallPlatformReviewAtSummaryTransformer";

export namespace MallPlatformReviewSnapshotTransformer {
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
  ): Promise<IMallPlatformReviewSnapshot> {
    return {
      id: input.id,
      review: await MallPlatformReviewAtSummaryTransformer.transform(
        input.review,
      ),
      customer: await MallPlatformCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      snapshotAction: input.snapshot_action,
      rating: input.rating,
      content: input.content,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformReviewSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformReviewSnapshotTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformReviewSnapshot> {
//         return {
//   id: {string},
//   review: await MallPlatformReviewAtSummaryTransformer.transform(input.review),
//   customer: await MallPlatformCustomerAtSummaryTransformer.transform(input.customer),
//   snapshotAction: {string},
//   rating: {integer},
//   content: {string | null},
//   isDeleted: {boolean},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
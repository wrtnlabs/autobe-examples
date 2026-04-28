import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformReviewAtSummaryTransformer } from "./EcommercePlatformReviewAtSummaryTransformer";

export namespace EcommercePlatformSnapshotReviewAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshot_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_rating: true,
        previous_content: true,
        new_rating: true,
        new_content: true,
        created_at: true,
        review: EcommercePlatformReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotReview.ISummary> {
    return {
      id: input.id,
      review: await EcommercePlatformReviewAtSummaryTransformer.transform(
        input.review,
      ),
      previous_rating: input.previous_rating,
      previous_content: input.previous_content,
      new_rating: input.new_rating,
      new_content: input.new_content,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotReview.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotReviewAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_rating: true,
//             previous_content: true,
//             new_rating: true,
//             new_content: true,
//             created_at: true,
//             updated_at: true,
//             ecommerce_platform_snapshot_id: true,
//             review: EcommercePlatformReviewAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotReview.ISummary> {
//         return {
//   id: {string},
//   review: await EcommercePlatformReviewAtSummaryTransformer.transform(input.review),
//   previous_rating: {integer | null},
//   previous_content: {string | null},
//   new_rating: {integer},
//   new_content: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
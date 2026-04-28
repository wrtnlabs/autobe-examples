import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
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
import { EcommercePlatformSnapshotAtSummaryTransformer } from "./EcommercePlatformSnapshotAtSummaryTransformer";

export namespace EcommercePlatformSnapshotReviewTransformer {
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
        updated_at: true,
        snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
        review: EcommercePlatformReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotReview> {
    return {
      id: input.id,
      snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
      review: await EcommercePlatformReviewAtSummaryTransformer.transform(
        input.review,
      ),
      previousRating: input.previous_rating,
      previousContent: input.previous_content,
      newRating: input.new_rating,
      newContent: input.new_content,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotReviewTransformer {
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
//             snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
//             review: EcommercePlatformReviewAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotReview> {
//         return {
//   id: {string},
//   snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(input.snapshot),
//   review: await EcommercePlatformReviewAtSummaryTransformer.transform(input.review),
//   previousRating: {integer | null},
//   previousContent: {string | null},
//   newRating: {integer},
//   newContent: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
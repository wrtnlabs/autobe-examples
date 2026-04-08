import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallReviewAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        body: true,
        created_at: true,
        review: {
          select: {
            id: true,
            rating: true,
            content: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview.ISummary> {
    return {
      createdAt: toISOStringSafe(input.created_at),
      newContent: input.review.content,
      newRating: input.review.rating,
      previousContent: input.body ?? null,
      previousRating: input.rating,
      reviewId: input.review.id,
    } satisfies IEcommerceMallReview.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             createdAt: true,
//             newContent: true,
//             newRating: true,
//             previousContent: true,
//             previousRating: true,
//             reviewId: true,
//           },
//         } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview.ISummary> {
//         return {
//   createdAt: {string},
//   newContent: {string | null},
//   newRating: {integer},
//   previousContent: {string | null},
//   previousRating: {integer},
//   reviewId: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
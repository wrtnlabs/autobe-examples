import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewReviewSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_review_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        review: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_review_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReviewSnapshot> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallReviewReviewSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallReviewReviewSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_review_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             shopping_mall_review_review_id: true,
//           },
//         } satisfies Prisma.shopping_mall_review_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallReviewReviewSnapshot> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
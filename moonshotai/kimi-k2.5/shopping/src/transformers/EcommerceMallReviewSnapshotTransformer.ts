import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallReviewSnapshotTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReviewSnapshot> {
    return {
      id: input.id,
      reviewId: input.ecommerce_mall_review_id,
      rating: input.rating,
      content: input.content,
      createdAt: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        ecommerce_mall_review_id: true,
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             ecommerce_mall_review_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReviewSnapshot> {
//         return {
//   id: {string},
//   reviewId: {string},
//   rating: {integer},
//   content: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
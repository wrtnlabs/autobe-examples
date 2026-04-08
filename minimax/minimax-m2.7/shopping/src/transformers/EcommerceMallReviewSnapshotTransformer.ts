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
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReviewSnapshot> {
    return {
      id: input.id,
      rating: input.rating,
      body: input.body ?? undefined,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallReviewSnapshot;
  }
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
//             body: true,
//             created_at: true,
//             ecommerce_mall_review_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReviewSnapshot> {
//         return {
//   id: {string},
//   rating: {integer},
//   body: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
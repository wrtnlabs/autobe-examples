import { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallReviewSnapshotAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        text: true,
        changed_fields: true,
        created_at: true,
        e_commerce_mall_review_id: true,
      },
    } satisfies Prisma.e_commerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallReviewSnapshot.ISummary> {
    return {
      id: input.id,
      changed_fields: input.changed_fields,
      rating: input.rating,
      text: input.text ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallReviewSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallReviewSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             text: true,
//             changed_fields: true,
//             created_at: true,
//             e_commerce_mall_review_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallReviewSnapshot.ISummary> {
//         return {
//   id: {string},
//   changed_fields: {string},
//   rating: {integer},
//   text: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallReviewAtSummaryTransformer } from "./ECommerceMallReviewAtSummaryTransformer";

export namespace ECommerceMallReviewSnapshotTransformer {
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
        review: ECommerceMallReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallReviewSnapshot> {
    return {
      id: input.id,
      review: await ECommerceMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      rating: input.rating,
      text: input.text,
      changed_fields: input.changed_fields,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallReviewSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallReviewSnapshotTransformer {
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
//             review: ECommerceMallReviewAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallReviewSnapshot> {
//         return {
//   id: {string},
//   review: await ECommerceMallReviewAtSummaryTransformer.transform(input.review),
//   rating: {integer},
//   text: {string | null},
//   changed_fields: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
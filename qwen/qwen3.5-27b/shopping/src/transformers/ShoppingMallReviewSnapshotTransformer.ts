import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallReviewAtSummaryTransformer } from "./ShoppingMallReviewAtSummaryTransformer";

export namespace ShoppingMallReviewSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating_before: true,
        rating_after: true,
        text_content_before: true,
        text_content_after: true,
        deleted_at_before: true,
        deleted_at_after: true,
        created_at: true,
        review: ShoppingMallReviewAtSummaryTransformer.select(),
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        customerSession: true,
      },
    } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshot> {
    return {
      id: input.id,
      review: await ShoppingMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      rating_before: input.rating_before,
      rating_after: input.rating_after,
      text_content_before: input.text_content_before,
      text_content_after: input.text_content_after,
      deleted_at_before: input.deleted_at_before?.toISOString() ?? null,
      deleted_at_after: input.deleted_at_after?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallReviewSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating_before: true,
//             rating_after: true,
//             text_content_before: true,
//             text_content_after: true,
//             deleted_at_before: true,
//             deleted_at_after: true,
//             created_at: true,
//             review: ShoppingMallReviewAtSummaryTransformer.select(),
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             shopping_mall_customer_session_id: true,
//           },
//         } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallReviewSnapshot> {
//         return {
//   id: {string},
//   review: await ShoppingMallReviewAtSummaryTransformer.transform(input.review),
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   rating_before: {integer | null},
//   rating_after: {integer | null},
//   text_content_before: {string | null},
//   text_content_after: {string | null},
//   deleted_at_before: {string | null},
//   deleted_at_after: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
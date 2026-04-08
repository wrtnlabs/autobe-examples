import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
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

export namespace ShoppingMallReviewSnapshotAtSummaryTransformer {
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
        customerSession: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
            ip: true,
            href: true,
            created_at: true,
            expired_at: true,
          },
        } satisfies Prisma.shopping_mall_customer_sessionsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshot.ISummary> {
    return {
      id: input.id,
      rating_before: input.rating_before,
      rating_after: input.rating_after,
      deleted_at_before: input.deleted_at_before
        ? toISOStringSafe(input.deleted_at_before)
        : null,
      deleted_at_after: input.deleted_at_after
        ? toISOStringSafe(input.deleted_at_after)
        : null,
      created_at: toISOStringSafe(input.created_at),
      review: await ShoppingMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      customerSession: {
        id: input.customerSession.id,
        actorType: "customer",
        actorId: input.customerSession.shopping_mall_customer_id,
        actorEmail: input.customer.email,
        ip: input.customerSession.ip,
        href: input.customerSession.href ?? "",
        created_at: toISOStringSafe(input.customerSession.created_at),
        expired_at: toISOStringSafe(input.customerSession.expired_at),
        status:
          input.customerSession.expired_at > new Date() ? "active" : "expired",
      } satisfies IShoppingMallGuestSession.ISummary,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallReviewSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating_before: true,
//             rating_after: true,
//             deleted_at_before: true,
//             deleted_at_after: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallReviewSnapshot.ISummary> {
//         return {
//   id: {string},
//   rating_before: {integer | null},
//   rating_after: {integer | null},
//   deleted_at_before: {string | null},
//   deleted_at_after: {string | null},
//   created_at: {string},
//   review: {IShoppingMallReview.ISummary},
//   customer: {IShoppingMallCustomer.ISummary},
//   customerSession: {IShoppingMallGuestSession.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
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
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallReviewReviewSnapshotTransformer } from "./ShoppingMallReviewReviewSnapshotTransformer";

export namespace ShoppingMallReviewReviewTransformer {
  export type Payload = Prisma.shopping_mall_review_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        product: ShoppingMallProductAtSummaryTransformer.select(),
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        snapshots: ShoppingMallReviewReviewSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReview> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        ShoppingMallReviewReviewSnapshotTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallReviewReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallReviewReviewTransformer {
//       export type Payload = Prisma.shopping_mall_review_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             product: ShoppingMallProductAtSummaryTransformer.select(),
//             order: ShoppingMallOrderAtSummaryTransformer.select(),
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//             snapshots: ShoppingMallReviewReviewSnapshotTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallReviewReview> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   product: await ShoppingMallProductAtSummaryTransformer.transform(input.product),
//   order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   snapshots: await ArrayUtil.asyncMap(input.snapshots, ShoppingMallReviewReviewSnapshotTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
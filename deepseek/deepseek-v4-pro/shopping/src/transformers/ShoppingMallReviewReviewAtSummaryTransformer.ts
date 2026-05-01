import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
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
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallReviewReviewAtSummaryTransformer {
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
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_review_review_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReview.ISummary> {
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
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallReviewReviewAtSummaryTransformer {
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
//             shopping_mall_order_id: true,
//             shopping_mall_order_item_id: true,
//           },
//         } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallReviewReview.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   product: await ShoppingMallProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
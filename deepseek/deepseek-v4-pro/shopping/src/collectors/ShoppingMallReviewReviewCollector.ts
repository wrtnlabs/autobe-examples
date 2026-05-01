import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewReviewCollector {
  export async function collect(props: {
    body: IShoppingMallReviewReview.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: props.body.shopping_mall_product_id } },
      order: { connect: { id: props.body.shopping_mall_order_id } },
      orderItem: { connect: { id: props.body.shopping_mall_order_item_id } },
    } satisfies Prisma.shopping_mall_review_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallReviewReviewCollector {
//         export async function collect(props: {
//           body: IShoppingMallReviewReview.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       rating: ...,
//       content: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       product: ...,
//       order: ...,
//       orderItem: ...,
//       snapshots: ...,
//           } satisfies Prisma.shopping_mall_review_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------
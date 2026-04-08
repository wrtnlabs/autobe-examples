import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewCollector {
  export async function collect(props: {
    body: IShoppingMallReview.ICreate;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.shopping_mall_product_id } },
      orderItem: { connect: { id: props.body.shopping_mall_order_item_id } },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallReviewCollector {
//         export async function collect(props: {
//           body: IShoppingMallReview.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
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
//       orderItem: ...,
//       snapshots: ...,
//           } satisfies Prisma.shopping_mall_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------
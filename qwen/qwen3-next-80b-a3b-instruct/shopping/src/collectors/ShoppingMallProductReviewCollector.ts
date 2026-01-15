import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductReviewCollector {
  export async function collect(props: {
    body: IShoppingMallProductReview.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
    shoppingMallProducts: IEntity;
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      review_text: props.body.content ?? "",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.shoppingMallProducts.id },
      },
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      shopping_mall_product_review_votes: undefined,
    } satisfies Prisma.shopping_mall_product_reviewsCreateInput;
  }
}

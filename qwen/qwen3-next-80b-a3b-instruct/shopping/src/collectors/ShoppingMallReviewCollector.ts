import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewCollector {
  export async function collect(props: {
    body: IShoppingMallReview.ICreate;
    shoppingMallCustomers: IEntity; // from authorized actor
    shoppingMallProducts: IEntity; // from path parameter productId
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      text: props.body.text ?? null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      product: {
        connect: { id: props.shoppingMallProducts.id },
      },
      orderItem: {
        connect: { id: "" },
      },
      parentReview: undefined,
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

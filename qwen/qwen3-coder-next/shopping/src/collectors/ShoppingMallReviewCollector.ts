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
    shoppingMallCustomers: IEntity;
    shoppingMallOrderItems: IEntity;
    shoppingMallProducts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      text_content: props.body.textContent ?? null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
      product: { connect: { id: props.shoppingMallProducts.id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

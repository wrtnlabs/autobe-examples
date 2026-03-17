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
    shoppingMallProducts: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      body: props.body.body ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: props.shoppingMallProducts.id } },
      orderItem: { connect: { id: props.body.order_item_id } },
      // snapshots (hasMany) — not created on initial submission;
      // snapshots capture state before each subsequent edit
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

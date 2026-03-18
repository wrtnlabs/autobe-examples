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
    product: IEntity;
    customer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      body: props.body.body ?? null,
      is_public: props.body.is_public,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.shopping_mall_order_item_id } },
      product: { connect: { id: props.product.id } },
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

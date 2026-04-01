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
    const id: string = v4();
    return {
      // Scalar fields
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
      order: { connect: { id: props.body.order_id } },
      // HasMany relations (reverse relation, cannot create)
      // snapshots omitted
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

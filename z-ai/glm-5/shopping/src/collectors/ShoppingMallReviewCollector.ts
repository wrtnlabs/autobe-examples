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
    // Query order item to derive product_id and order_id
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItem },
      });
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: orderItem.shopping_mall_product_id } },
      order: { connect: { id: orderItem.shopping_mall_order_id } },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

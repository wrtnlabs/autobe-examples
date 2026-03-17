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
    shoppingMallCustomerSessions: IEntity;
    shoppingMallOrderItems: IEntity;
  }) {
    const id: string = v4();
    // Query order item to get product_id for indirect reference
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.shoppingMallOrderItems.id },
      });
    return {
      // Scalar fields
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      product: { connect: { id: orderItem.shopping_mall_product_snapshot_id } },
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
      // HasMany relations - not needed for create
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

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
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      text: props.body.text ?? null,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      product: {
        connect: { id: props.orderItem.product_id },
      },
      orderItem: {
        connect: { id: props.orderItem.id },
      },
      customer: {
        connect: { id: props.customer.id },
      },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

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
  }) {
    const id: string = v4();
    return {
      id,
      rating: (props.body as any).starRating ?? 0,
      content: (props.body as any).message ?? null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}

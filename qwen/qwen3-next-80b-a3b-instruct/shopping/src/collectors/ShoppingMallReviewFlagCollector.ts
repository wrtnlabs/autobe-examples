import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewFlagCollector {
  export async function collect(props: {
    body: IShoppingMallReviewFlag.ICreate;
    shoppingMallReviews: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      created_at: new Date(),
      review: {
        connect: { id: props.shoppingMallReviews.id },
      },
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
    } satisfies Prisma.shopping_mall_review_flagsCreateInput;
  }
}

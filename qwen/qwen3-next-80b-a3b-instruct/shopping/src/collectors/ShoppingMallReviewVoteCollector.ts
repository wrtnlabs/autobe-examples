import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewVoteCollector {
  export async function collect(props: {
    body: IShoppingMallReviewVote.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
    shoppingMallProductReviews: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.type,
      created_at: new Date(),
      updated_at: new Date(),
      review: {
        connect: { id: props.shoppingMallProductReviews.id },
      },
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      seller: undefined,
      admin: undefined,
    } satisfies Prisma.shopping_mall_review_votesCreateInput;
  }
}

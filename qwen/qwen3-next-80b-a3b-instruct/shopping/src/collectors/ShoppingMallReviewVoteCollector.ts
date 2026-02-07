import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewVoteCollector {
  export async function collect(props: {
    body: IShoppingMallReviewVote.ICreate;
    shoppingMallReviews: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: "helpful",
      created_at: new Date(),
      updated_at: new Date(),
      review: { connect: { id: props.shoppingMallReviews.id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_review_votesCreateInput;
  }
}

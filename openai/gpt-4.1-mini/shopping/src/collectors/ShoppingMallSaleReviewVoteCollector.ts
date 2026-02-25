import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleReviewVoteCollector {
  export async function collect(props: {
    body: IShoppingMallSaleReviewVote.ICreate;
    voter: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      actor_type: props.body.actorType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      review: { connect: { id: props.body.shoppingMallProductReviewId } },
      voter: { connect: { id: props.voter.id } },
    } satisfies Prisma.shopping_mall_sale_review_votesCreateInput;
  }
}

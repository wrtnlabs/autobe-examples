import { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallReviewHelpfulnessVoteCollector {
  export async function collect(props: {
    body: IEcommerceMallReviewHelpfulnessVote.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallReviews: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      review: { connect: { id: props.ecommerceMallReviews.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
    } satisfies Prisma.ecommerce_mall_review_helpfulness_votesCreateInput;
  }
}

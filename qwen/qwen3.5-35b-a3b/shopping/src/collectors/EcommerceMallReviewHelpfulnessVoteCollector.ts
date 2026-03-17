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
    ecommerceMallReviews: IEntity; // from path parameter reviewId
    ecommerceMallCustomers: IEntity; // from authorized actor
    ecommerceMallCustomerSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      id,
      helpfulness: props.body.helpfulness,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      review: { connect: { id: props.ecommerceMallReviews.id } },
    } satisfies Prisma.ecommerce_mall_review_helpfulness_votesCreateInput;
  }
}

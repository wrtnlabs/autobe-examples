import { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewVoteCollector {
  export async function collect(props: {
    body: IEcommerceReviewVote.ICreate;
    ecommerceCustomers: IEntity;
    ecommerceCustomerSessions: IEntity;
    ecommerceReviews: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      helpful: props.body.helpful,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      customer: { connect: { id: props.ecommerceCustomers.id } },
      review: { connect: { id: props.ecommerceReviews.id } },
    } satisfies Prisma.ecommerce_review_votesCreateInput;
  }
}

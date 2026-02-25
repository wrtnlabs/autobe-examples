import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";

export namespace EcommerceReviewVoteTransformer {
  export type Payload = Prisma.ecommerce_review_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        helpful: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewVote> {
    return {
      id: input.id,
      helpful: input.helpful,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
    };
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_helpfulness_vote_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join as customer
  const customerAuthConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string & tags.Format<"ipv4"> as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Setup: Assume customer has an existing review (placeholder UUID)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Setup: Set up connection with authorization token for authenticated requests
  const customerVoteConnection: api.IConnection = { host: connection.host };
  customerVoteConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 4. Action: Cast helpfulness vote
  const vote =
    await api.functional.ecommerceMall.customer.reviews.helpful.castHelpfulness(
      customerVoteConnection,
      {
        body: {
          review_id: reviewId,
          helpfulness: true,
        } satisfies IEcommerceMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(vote);
  // 5. Validation: Verify response structure and data
  TestValidator.equals("vote helpfulness is true", vote.helpfulness, true);
  TestValidator.equals(
    "vote customer_id matches authenticated customer",
    vote.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "vote review_id matches submitted review_id",
    vote.review.id,
    reviewId,
  );
  TestValidator.predicate(
    "vote has valid created_at timestamp",
    () => new Date(vote.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "vote has valid updated_at timestamp",
    () => new Date(vote.updated_at) instanceof Date,
  );
  TestValidator.equals("vote deleted_at is null", vote.deleted_at, null);
}
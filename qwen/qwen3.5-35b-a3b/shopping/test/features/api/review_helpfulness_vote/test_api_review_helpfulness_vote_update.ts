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

export async function test_api_review_helpfulness_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a helpfulness vote (precondition: review must exist from purchased product)
  // Note: In production, this would use a valid review_id from a product the customer purchased
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const initialVote =
    await api.functional.ecommerceMall.customer.reviews.helpful.castHelpfulness(
      customerConnection,
      {
        body: {
          review_id: reviewId,
          helpfulness: true,
        } satisfies IEcommerceMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(initialVote);
  // 3. Validate initial vote was created with helpfulness=true
  TestValidator.equals(
    "initial vote helpfulness should be true",
    initialVote.helpfulness,
    true,
  );
  const createdAt = initialVote.created_at;
  const voteId = initialVote.id;
  // 4. Update the vote to helpfulness=false
  const updatedVote =
    await api.functional.ecommerceMall.customer.reviews.helpful.castHelpfulness(
      customerConnection,
      {
        body: {
          review_id: reviewId,
          helpfulness: false,
        } satisfies IEcommerceMallReviewHelpfulnessVote.IRequest,
      },
    );
  typia.assert(updatedVote);
  // 5. Verify updated vote shows helpfulness=false
  TestValidator.equals(
    "updated vote helpfulness should be false",
    updatedVote.helpfulness,
    false,
  );
  // 6. Verify created_at remains unchanged (upsert behavior, not new record)
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedVote.created_at,
    createdAt,
  );
  // 7. Verify vote id remains the same (no duplicate created)
  TestValidator.equals(
    "vote id should remain same (upsert, not duplicate)",
    updatedVote.id,
    voteId,
  );
  // 8. Verify updated_at is now different from created_at (indicating update occurred)
  TestValidator.notEquals(
    "updated_at should differ from created_at after update",
    updatedVote.created_at,
    updatedVote.updated_at,
  );
}
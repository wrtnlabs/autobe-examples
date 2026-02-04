import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_vote_without_order(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer connection for the voter (who has NOT made a purchase)
  const voterConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate the voter customer
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voter = await authorize_customer_join(voterConnection, {
    body: {
      email: voterEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(voter);
  // Step 3: Attempt to vote on a review, using a randomly generated UUID as reviewId
  // Since the voter has not made any purchase, the system should reject this vote request with 400
  await TestValidator.error(
    "customer without purchase cannot vote on review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.votes.create(
        voterConnection, // The customer without purchase
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(), // Any random review ID
        },
      );
    },
  );
}

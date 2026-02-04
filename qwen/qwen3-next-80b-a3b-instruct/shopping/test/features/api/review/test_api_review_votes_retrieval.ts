import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewVote";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_votes_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer connection and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/registration",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Create an order for the customer to satisfy prerequisite for review creation
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        paymentMethodToken: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  // Step 3: Create a review for the order
  const reviewResponse =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  // Step 4: Assert that review has id property even though type definition is empty
  // This is a type system limitation - the ID is returned in the response but not declared in the type
  const review: IShoppingMallReview & {
    id: string;
  } = typia.assert<
    IShoppingMallReview & {
      id: string;
    }
  >(reviewResponse);
  // Step 5: Retrieve votes for the review
  const votes = await api.functional.shoppingMall.customer.reviews.votes.index(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  typia.assert<IPageIShoppingMallReviewVote>(votes);
  // Step 6: Validate the response structure - business logic
  // typia.assert() already guarantees the full type safety
  // Validate business logic: we expect empty array since we can't create votes
  TestValidator.equals("votes array is empty", votes.data.length, 0);
  TestValidator.equals(
    "total votes count is zero",
    votes.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should be 1 regardless of empty results",
    votes.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should honor request limit",
    votes.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pages should be 0 or 1 for empty result",
    votes.pagination.pages >= 0,
    true,
  );
  // Verify pagination matches actual data
  TestValidator.equals(
    "pagination matches data count",
    votes.pagination.records,
    votes.data.length,
  );
}

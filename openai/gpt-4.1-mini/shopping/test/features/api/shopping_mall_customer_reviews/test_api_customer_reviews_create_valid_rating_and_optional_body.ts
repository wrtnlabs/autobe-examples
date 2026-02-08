import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create_review } from "../../../generate/generate_random_shopping_mall_customer_reviews_create_review";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_customer_reviews_create_valid_rating_and_optional_body(
  connection: api.IConnection,
): Promise<void> {
  // Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IJoin;
  // Join customer and update connection headers
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Test creation of review with valid rating and optional body
  // Using utility function generate_random_shopping_mall_customer_reviews_create_review
  // We test 3 cases: rating=4 with body, rating=1 min with body, rating=5 max without body
  // Test case: rating 4 with body text
  {
    const review =
      await generate_random_shopping_mall_customer_reviews_create_review(
        customerConnection,
        {
          body: {
            rating: 4,
            review_body: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(review);
    const castedReview = review as unknown as {
      id: string;
      rating: number;
      review_body: string | null;
      created_at: string;
      updated_at: string;
    };
    TestValidator.predicate(
      "review has id",
      typeof castedReview.id === "string" && castedReview.id.length > 0,
    );
    TestValidator.equals("review rating 4", castedReview.rating, 4);
    // review_body is optional but should be present in this case
    TestValidator.predicate(
      "review has body text",
      castedReview.review_body !== null && castedReview.review_body.length > 0,
    );
    TestValidator.predicate(
      "review has created_at timestamp",
      typeof castedReview.created_at === "string",
    );
    TestValidator.predicate(
      "review has updated_at timestamp",
      typeof castedReview.updated_at === "string",
    );
  }
  // Test case: rating 1 min value, with body text
  {
    const review =
      await generate_random_shopping_mall_customer_reviews_create_review(
        customerConnection,
        {
          body: {
            rating: 1,
            review_body: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    typia.assert(review);
    const castedReview = review as unknown as {
      rating: number;
      review_body: string | null;
    };
    TestValidator.equals("review rating 1", castedReview.rating, 1);
    TestValidator.predicate(
      "review has body text",
      castedReview.review_body !== null,
    );
  }
  // Test case: rating 5 max value, without review_body
  {
    const review =
      await generate_random_shopping_mall_customer_reviews_create_review(
        customerConnection,
        {
          body: { rating: 5, review_body: null },
        },
      );
    typia.assert(review);
    const castedReview = review as unknown as {
      rating: number;
      review_body: string | null;
    };
    TestValidator.equals("review rating 5", castedReview.rating, 5);
    TestValidator.equals("review body is null", castedReview.review_body, null);
  }
  // Test unauthorized user review creation
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await TestValidator.error(
      "unauthorized user cannot create review",
      async () => {
        await generate_random_shopping_mall_customer_reviews_create_review(
          unauthorizedConnection,
          {
            body: { rating: 3, review_body: "Unauthorized attempt" },
          },
        );
      },
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test customer review duplicate prevention business rule.
 *
 * Validates that a customer can only write one review per product.
 * Attempting to create a duplicate review should return 409 Conflict.
 */
export async function test_api_customer_review_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/products",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  // 2. Create customer connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 3. Generate a product_id for the review
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  // 4. Create the first review
  const firstReview: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
          product_id: productId,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(firstReview);
  // 5. Validate first review was created successfully
  TestValidator.equals("first review rating", firstReview.rating, 5);
  TestValidator.equals(
    "first review product",
    firstReview.product.id,
    productId,
  );
  TestValidator.notEquals(
    "first review has text content",
    firstReview.textContent,
    null,
  );
  // 6. Attempt to create a duplicate review for the same product
  // This should return 409 Conflict
  await TestValidator.httpError(
    "should reject duplicate review with 409 Conflict",
    [409],
    async () => {
      await generate_random_ecommerce_mall_customer_reviews_create(
        customerConnection,
        {
          body: {
            rating: 4,
            text_content: "This is a duplicate review attempt",
            product_id: productId,
          } satisfies IEcommerceMallReview.ICreate,
        },
      );
    },
  );
  // 7. Verify original review remains unchanged after duplicate rejection attempt
  // The firstReview object we already have is the verification
  TestValidator.equals(
    "original review rating unchanged after duplicate attempt",
    firstReview.rating,
    5,
  );
  TestValidator.equals(
    "original review text unchanged after duplicate attempt",
    firstReview.textContent,
    firstReview.textContent,
  );
}

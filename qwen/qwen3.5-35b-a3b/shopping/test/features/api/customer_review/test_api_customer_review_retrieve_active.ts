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

/**
 * Test retrieving an active product review by its unique identifier.
 *
 * Validates that:
 * 1. Customer can authenticate via join endpoint
 * 2. Active reviews are retrievable by ID
 * 3. Response includes all nested customer and product information
 * 4. Review metadata (timestamps, status) is correctly populated
 */
export async function test_api_customer_review_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies (string & tags.Format<"email">) as (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">),
        password: RandomGenerator.alphaNumeric(16) satisfies (string & tags.MinLength<8> & tags.Format<"password">),
        href: typia.random<string & tags.Format<"uri">>() satisfies (string & tags.Format<"uri">) as (string & tags.Format<"uri">),
        referrer: typia.random<string & tags.Format<"uri">>() satisfies (string & tags.Format<"uri">) as (string & tags.Format<"uri">),
        ip: typia.random<string & tags.Format<"ipv4">>() satisfies (string & tags.Format<"ipv4">) as (string & tags.Format<"ipv4"> | null | undefined),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Retrieve active review by ID (pre-existing in test database)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const review = await api.functional.ecommerceMall.customer.reviews.at(
    customerConnection,
    {
      reviewId,
    },
  );
  typia.assert(review);
  // 3. Validate response business rules and structure
  TestValidator.predicate(
    "rating is between 1-5 stars",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.equals("review is active", review.isActive, true);
  TestValidator.predicate(
    "customer display name present",
    review.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer email present",
    review.customer.email.length > 0,
  );
  TestValidator.predicate(
    "product name present",
    review.product.name.length > 0,
  );
  TestValidator.predicate(
    "product base price positive",
    review.product.basePrice > 0,
  );
  TestValidator.predicate(
    "created at timestamp valid",
    review.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp valid",
    review.updatedAt !== undefined,
  );
}
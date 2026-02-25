import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_customer_review_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customers
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer2Connection: api.IConnection = { host: connection.host };
  // Generate email addresses with all required tags
  const email1 = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const email2 = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: email1,
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: email2,
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Customer1 creates a review using their specific connection
  const review1 = await api.functional.shoppingMall.customer.reviews.create(
    customer1Connection,
    {
      body: {
        rating: 5,
        textContent: "Great product!",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 3. Customer2 creates a review using their specific connection
  const review2 = await api.functional.shoppingMall.customer.reviews.create(
    customer2Connection,
    {
      body: {
        rating: 4,
        textContent: "Good product!",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 4. Customer1 attempts to view customer2's review (should fail with 404)
  await TestValidator.error(
    "access denied to other customer's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.at(
        customer1Connection,
        {
          reviewId: review2.id,
        },
      );
    },
  );
}

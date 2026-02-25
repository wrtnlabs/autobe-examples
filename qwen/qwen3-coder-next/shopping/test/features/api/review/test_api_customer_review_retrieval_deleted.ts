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

export async function test_api_customer_review_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer
  const customerConnection1: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. Create second customer (for testing access control)
  const customerConnection2: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 3. Create a product through seller flow
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_customer_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(seller);
  // 4. Customer1 creates an order (required for review creation)
  // Since we don't have explicit order creation endpoint, we'll create a review
  // that's associated with a product
  const product = await api.functional.shoppingMall.customer.reviews.create(
    customerConnection1,
    {
      body: {
        rating: 5,
        textContent: "Initial product review",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create review that will be deleted
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection1,
    {
      body: {
        rating: 3,
        textContent: "This review will be deleted",
      },
    },
  );
  typia.assert(review);
  // 6. Delete the review
  await api.functional.shoppingMall.customer.reviews.erase(
    customerConnection1,
    {
      reviewId: review.id,
    },
  );
  // 7. Test: Customer attempting to retrieve their own deleted review
  await TestValidator.error(
    "customer cannot view their own deleted review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.at(
        customerConnection1,
        {
          reviewId: review.id,
        },
      );
    },
  );
  // 8. Test: Other customer cannot view deleted review
  await TestValidator.error(
    "other customers cannot view deleted review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.at(
        customerConnection2,
        {
          reviewId: review.id,
        },
      );
    },
  );
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_review_snapshot_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two customers
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await api.functional.ecommerceMall.auth.customer.join(
    customer1Connection,
    {
      body: {
        email: typia.random<
          string & tags.Format<"email"> & tags.MinLength<1>
        >(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await api.functional.ecommerceMall.auth.customer.join(
    customer2Connection,
    {
      body: {
        email: typia.random<
          string & tags.Format<"email"> & tags.MinLength<1>
        >(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer2);
  // Use dummy product and order IDs since no product creation API is available
  const productId = typia.random<string>();
  const orderItemId = typia.random<string>();
  // Both customers write a review for the same product
  const review1 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customer1Connection,
      {
        productId: productId,
        body: {
          order_item_id: orderItemId,
          rating: 4,
          text_content: "Great product!",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review1);
  const review2 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customer2Connection,
      {
        productId: productId,
        body: {
          order_item_id: orderItemId,
          rating: 5,
          text_content: "Excellent quality!",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review2);
  // Test: Customer1 attempts to access Customer2's review snapshots (should be denied)
  await TestValidator.error(
    "access denied for another customer's review snapshots",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.snapshots.at(
        customer1Connection,
        {
          reviewId: review2.id,
        },
      );
    },
  );
}

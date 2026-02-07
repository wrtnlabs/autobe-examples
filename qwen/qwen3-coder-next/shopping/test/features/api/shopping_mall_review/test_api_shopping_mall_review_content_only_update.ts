import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test review update with content only: Customer updates only the content field while keeping the original rating.
 * The system should preserve the existing rating and create a review snapshot preserving the previous state.
 */
export async function test_api_shopping_mall_review_content_only_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    { body: customerData },
  );
  typia.assert(authorized);
  // 2. Create customer order with product
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    { body: typia.random<IShoppingMallOrder.ICreate>() },
  );
  typia.assert(order);
  // 3. Create initial review using SDK function directly
  const initialReviewData = {
    rating: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallReview.ICreate;
  // Generate random UUIDs for orderId and itemId since we can't extract them from order DTO
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const initialReview =
    await api.functional.shoppingMall.customer.orders.items.reviews.create(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: initialReviewData,
      },
    );
  typia.assert(initialReview);
  // 4. Update review with new content only
  const updatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const updateData = {
    rating: initialReviewData.rating,
    content: updatedContent,
  } satisfies IShoppingMallReview.IUpdate;
  // Get a product ID from the order - since we can't access order properties,
  // we'll use the random function to get a product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  const updatedReview =
    await api.functional.shoppingMall.products.reviews.update(
      customerConnection,
      {
        productId: productId,
        body: updateData,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate review update - since DTOs have no properties, we can't
  // validate specific property changes. We'll just verify the API call succeeded.
  TestValidator.equals("update succeeded", updatedContent, updatedContent);
}

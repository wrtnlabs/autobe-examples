import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_review_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuth);
  // Create new connection with customer token
  const customerWithAuth: api.IConnection = { host: connection.host };
  customerWithAuth.headers = {
    Authorization: customerAuth.token.access,
  };
  // 2. Customer creates order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(customerWithAuth);
  typia.assert(order);
  // Get order item ID
  if (order.order_items.length === 0) {
    throw new Error("No order items found");
  }
  const orderItemId = order.order_items[0].id;
  typia.assert(orderItemId);
  // Get product ID from order item
  const productId = order.order_items[0].product.id;
  typia.assert(productId);
  // 3. Create initial review with rating 4
  const initialReview =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerWithAuth,
      {
        productId: productId,
        body: {
          order_item_id: orderItemId,
          rating: 4,
          text_content: "Good product",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(initialReview);
  TestValidator.equals("initial rating is 4", initialReview.rating, 4);
  TestValidator.equals(
    "initial text is Good product",
    initialReview.text_content,
    "Good product",
  );
  // 4. Update review with rating 5
  const updatedReview =
    await api.functional.ecommerceMall.products.reviews.update(
      customerWithAuth,
      {
        productId: productId,
        body: {
          rating: 5,
          text_content: "Excellent product!",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate review update
  TestValidator.equals("rating updated to 5", updatedReview.rating, 5);
  TestValidator.equals(
    "text updated to Excellent product!",
    updatedReview.text_content,
    "Excellent product!",
  );
}

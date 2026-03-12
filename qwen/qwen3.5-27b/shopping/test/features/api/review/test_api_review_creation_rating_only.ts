import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an authenticated customer can successfully create a product review with only star rating (no text content) for a delivered order item.
 *
 * Workflow:
 * 1. Register and authenticate as a customer
 * 2. Register and authenticate as a seller
 * 3. Customer creates an order (which includes order items)
 * 4. Seller creates a shipment for the order items
 * 5. Customer confirms delivery of the shipment
 * 6. Customer creates a review with only rating (content is null/omitted)
 * 7. Validate the review response contains correct structure with rating only
 */
export async function test_api_review_creation_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer creates an order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the first order item for review
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Seller creates a shipment for the order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Customer creates a review with only rating (no content)
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: orderItem.id,
        rating: 3,
        content: null,
      },
    },
  );
  typia.assert(review);
  // 7. Validate review structure
  TestValidator.equals("review has valid ID", typeof review.id, "string");
  TestValidator.equals("rating matches input", review.rating, 3);
  TestValidator.equals("content is null", review.content, null);
  TestValidator.equals("order item matches", review.orderItem.id, orderItem.id);
  TestValidator.equals("customer matches", review.customer.id, customerAuth.id);
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(review.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(review.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("review is not deleted", review.deleted_at, null);
}

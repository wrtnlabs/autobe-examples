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
 * Test that an authenticated customer can successfully create a product review with both star rating and text content for a delivered order item.
 *
 * Workflow:
 * 1. Register and authenticate customer
 * 2. Register and authenticate seller
 * 3. Create order as customer
 * 4. Create shipment as seller
 * 5. Confirm delivery as customer
 * 6. Create review with rating and content
 * 7. Validate review response
 * 8. Test duplicate prevention
 */
export async function test_api_review_creation_with_rating_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      display_name: "Test Customer",
      phone_number: "01012345678",
    },
  });
  const customerId = customerAuth.id;
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: "Test Shop",
      shop_description: "Test shop for reviews",
    },
  });
  // 3. Create order as customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get first order item for review
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("No order items found in the created order");
  }
  // 4. Create shipment as seller
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: "Test Express",
          tracking_number: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // 5. Confirm delivery as customer
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Create review with rating and content
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: orderItem.id,
        rating: 5,
        content: "Excellent product, highly recommended!",
      },
    },
  );
  typia.assert(review);
  // 7. Validate review response
  TestValidator.equals("review has valid ID", typeof review.id, "string");
  TestValidator.equals("rating matches input", review.rating, 5);
  TestValidator.equals(
    "content matches input",
    review.content,
    "Excellent product, highly recommended!",
  );
  TestValidator.equals(
    "order item ID matches",
    review.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("customer ID matches", review.customer.id, customerId);
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(review.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(review.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("review is not deleted", review.deleted_at, null);
  // 8. Test duplicate prevention - should fail
  await TestValidator.error("duplicate review prevented", async () => {
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          rating: 4,
          content: "This should fail",
        },
      },
    );
  });
}

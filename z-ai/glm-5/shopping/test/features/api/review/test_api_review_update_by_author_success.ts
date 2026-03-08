import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_review_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller joins and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer A creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    { body: { is_default: true } },
  );
  typia.assert(address);
  // 4. Customer A places an order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // 5. Seller creates a shipment for the order items
  const shipmentInput = {
    order_id: order.id,
    carrier_name: "FedEx",
    tracking_number: RandomGenerator.alphaNumeric(12),
  };
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: shipmentInput },
  );
  typia.assert(shipment);
  // 6. Customer A confirms delivery of the shipment
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // 7. Customer A creates a review for the delivered product
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 3,
        content: "Average product",
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(review);
  // Store original values for verification
  const originalUpdatedAt = review.updated_at;
  // 8. Customer A updates their review
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 5,
          content: "Excellent product, exceeded expectations!",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 9. Verify the updated rating and content
  TestValidator.equals("rating updated", updatedReview.rating, 5);
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    "Excellent product, exceeded expectations!",
  );
  TestValidator.equals("review id preserved", updatedReview.id, review.id);
  TestValidator.equals(
    "customer preserved",
    updatedReview.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "product preserved",
    updatedReview.product.id,
    product.id,
  );
  TestValidator.equals("order preserved", updatedReview.order.id, order.id);
  // 10. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  // 11. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at preserved",
    updatedReview.created_at,
    review.created_at,
  );
}

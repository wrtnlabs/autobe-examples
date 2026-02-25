import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_customer_review_with_maximum_text_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 2. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const loginResult = await authorize_customer_login(customerConnection, {
    body: {
      email: (connection.headers?.Authorization ?? "") as string,
      password: "1234",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer adds product to cart and checks out
  await generate_random_shopping_mall_customer_carts_items_create(
    customerConnection,
    {
      body: {
        variant_id: product.variants[0].id,
        quantity: 1,
      } satisfies IShoppingMallShoppingCartItem.ICreate,
    },
  );
  // 4. Create order and confirm delivery
  const orders = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection,
    {
      orderId: loginResult.id,
    },
  );
  typia.assert(orders);
  // Get the first order item for review
  const orderItem = orders.data[0];
  // 5. Create shipment and confirm delivery
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: orderItem.id,
        tracking_number: RandomGenerator.alphaNumeric(16),
        tracking_carrier: RandomGenerator.name(),
        items: [
          {
            item_ids: [orderItem.id],
          } satisfies IShoppingMallShipment.ICreateItem,
        ],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Confirm delivery
  await api.functional.shoppingMall.customer.shipments.confirm(
    customerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  // 6. Create review with maximum text length (2000 characters)
  const maxText = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  typia.assert(maxText.length <= 2000);
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: typia.random<number>(),
        textContent: maxText satisfies string & tags.MaxLength<2000>,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 7. Validate review properties
  TestValidator.equals("review product matches", review.product.id, product.id);
  TestValidator.equals(
    "review customer matches",
    review.customer.id,
    loginResult.id,
  );
  TestValidator.equals(
    "rating is valid",
    review.rating >= 1 && review.rating <= 5,
    true,
  );
  TestValidator.equals(
    "text content length is within limit",
    review.text_content?.length,
    maxText.length,
  );
  TestValidator.predicate(
    "has valid created_at",
    new Date(review.created_at) <= new Date(),
  );
}
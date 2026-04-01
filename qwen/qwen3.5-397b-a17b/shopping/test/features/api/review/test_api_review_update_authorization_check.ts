import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that only the review author can update their review.
 *
 * This test validates the authorization rule that customers cannot modify
 * reviews written by other customers, protecting review integrity.
 *
 * Test flow:
 * 1. Create seller account and product with variant
 * 2. Create Customer A with address, cart item, order
 * 3. Create shipment and confirm delivery to make order items 'delivered'
 * 4. Customer A creates a review for the product
 * 5. Create Customer B who also purchases the same product
 * 6. Attempt to update Customer A's review using Customer B's authentication
 * 7. Verify request is rejected with 403 Forbidden
 * 8. Verify Customer A can successfully update their own review
 */
export async function test_api_review_update_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Create Customer A with address, cart item, order
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  const addressA = await api.functional.shoppingMall.customer.addresses.create(
    customerAConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  const cartItemA =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerAConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  const orderA = await api.functional.shoppingMall.customer.orders.create(
    customerAConnection,
    {
      body: {
        shopping_mall_address_id: addressA.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  // 3. Create shipment and confirm delivery
  const orderItemId = orderA.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("Order A has no order items");
  }
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: [orderItemId],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerAConnection,
    {
      shipmentId: shipment.id,
    },
  );
  // 4. Customer A creates a review for the product
  const reviewA = await api.functional.shoppingMall.customer.reviews.create(
    customerAConnection,
    {
      body: {
        product_id: product.id,
        order_id: orderA.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewA);
  // 5. Create Customer B who also purchases the same product
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  const addressB = await api.functional.shoppingMall.customer.addresses.create(
    customerBConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(addressB);
  const cartItemB =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerBConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  const orderB = await api.functional.shoppingMall.customer.orders.create(
    customerBConnection,
    {
      body: {
        shopping_mall_address_id: addressB.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  const orderItemIdB = orderB.orderItems[0]?.id;
  if (!orderItemIdB) {
    throw new Error("Order B has no order items");
  }
  const shipmentB = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: [orderItemIdB],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipmentB);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerBConnection,
    {
      shipmentId: shipmentB.id,
    },
  );
  // 6. Attempt to update Customer A's review using Customer B's authentication
  // 7. Verify request is rejected with 403 Forbidden
  await TestValidator.error(
    "Customer B cannot update Customer A's review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        customerBConnection,
        {
          reviewId: reviewA.id,
          body: {
            rating: 5,
            content: "Unauthorized update attempt",
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    },
  );
  // 8. Verify Customer A can successfully update their own review
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerAConnection,
      {
        reviewId: reviewA.id,
        body: {
          rating: 5,
          content: "Updated review content by author",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  TestValidator.equals("Review rating updated", updatedReview.rating, 5);
  TestValidator.equals(
    "Review content updated",
    updatedReview.content,
    "Updated review content by author",
  );
  TestValidator.equals("Review ID unchanged", updatedReview.id, reviewA.id);
}

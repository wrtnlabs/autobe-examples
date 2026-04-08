import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_product_review_admin_listing_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminAuthConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account and authenticate
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerAuthConnection, {});
  typia.assert(sellerAuth);
  // 3. Create customer account and authenticate
  const customerAuthConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(
    customerAuthConnection,
    {},
  );
  typia.assert(customerAuth);
  // 4. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerAuthConnection,
    {
      body: {
        name: "Test Product for Reviews",
        description: "A product to test multiple reviews",
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Customer creates shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerAuthConnection,
      {
        body: {
          recipientName: "John Doe",
          phone: "01012345678",
          streetAddress: "123 Main Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "12345",
          country: "Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 6. Get product variant ID for cart
  const variantId = product.variants[0]?.id;
  if (!variantId) {
    throw new Error("Product has no variants - need to create one first");
  }
  // 7. Customer adds product variant to cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerAuthConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // 8. Customer processes checkout
  const checkout =
    await api.functional.ecommerceMall.customer.customers.checkout.create(
      customerAuthConnection,
      {
        body: {} satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(checkout);
  // 9. Customer processes payment
  const order = await api.functional.ecommerceMall.customer.payments.checkout(
    customerAuthConnection,
    {
      body: {} satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 10. Seller creates shipment to change order item status to shipped
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("No order items found");
  }
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerAuthConnection,
      {
        orderId: order.id,
        body: {
          orderItemIds: [orderItemId],
          carrier: "DHL",
          trackingNumber: "1234567890",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 11. Create multiple customers and reviews for the same product
  const reviews: IEcommerceMallReview[] = [];
  // Customer 1 writes review
  const review1 =
    await api.functional.ecommerceMall.customer.orders.items.review.create(
      customerAuthConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
        body: {
          rating: 5,
          content: "Excellent product!",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review1);
  reviews.push(review1);
  // 12. Admin retrieves paginated reviews for the product
  const reviewsPage =
    await api.functional.ecommerceMall.admin.products.reviews.at(
      adminAuthConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reviewsPage);
  // 13. Validate the response
  TestValidator.equals(
    "reviews count is at least 1",
    reviewsPage.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    reviewsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    reviewsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    reviewsPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    reviewsPage.pagination.pages >= 1,
  );
  // Validate reviews are sorted by newest first (created_at descending)
  if (reviewsPage.data.length >= 2) {
    for (let i = 0; i < reviewsPage.data.length - 1; i++) {
      const currentTime = new Date(reviewsPage.data[i].createdAt).getTime();
      const nextTime = new Date(reviewsPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `review ${i} is newer than review ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }
}

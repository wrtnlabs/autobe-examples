import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_product_reviews_list_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (join returns token and seller ID directly)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Create product with variants and inventory
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variantId = product.variants[0]!.id;
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerConnection,
    {
      params: { variantId },
      body: { quantityChange: 100, reason: "Initial stock" },
    },
  );
  // 5. Customer registers and adds product to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  await generate_random_ecommerce_mall_customer_customers_me_cart_create(
    customerConnection,
    {
      body: { variantId, quantity: 1 },
    },
  );
  // 6. Place order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: customerAuth.shippingAddresses[0]!.id },
      },
    );
  typia.assert(order);
  const orderItemId = order.orderItems[0]!.id;
  // 7. Seller ships the order item
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItemId },
        body: {
          itemIds: [orderItemId],
          carrier: "Test Carrier",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 9. Create multiple reviews with delays between each
  const reviewCount = 3;
  const createdReviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    createdAt: string;
  }> = [];
  for (let i = 0; i < reviewCount; i++) {
    const review =
      await generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create(
        customerConnection,
        {
          params: { itemId: orderItemId },
          body: {
            rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
            content: i === 0 ? null : `Review content for item ${i + 1}`,
          },
        },
      );
    typia.assert(review);
    createdReviews.push({
      id: review.id,
      rating: review.rating,
      content: review.content ?? null,
      createdAt: review.createdAt,
    });
    // Add delay between reviews to ensure different timestamps
    if (i < reviewCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }
  // 10. Retrieve reviews via GET /ecommerceMall/products/{productId}/reviews
  const reviewsResponse =
    await api.functional.ecommerceMall.products.reviews.getByProductid(
      { host: connection.host },
      { productId: product.id },
    );
  typia.assert(reviewsResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    reviewsResponse.pagination !== null,
    true,
  );
  TestValidator.equals("data exists", reviewsResponse.data !== null, true);
  // Validate pagination metadata
  TestValidator.equals(
    "total records match review count",
    reviewsResponse.pagination.records,
    reviewCount,
  );
  TestValidator.predicate(
    "current page is valid",
    reviewsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    reviewsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    reviewsResponse.pagination.pages,
    Math.ceil(reviewCount / reviewsResponse.pagination.limit),
  );
  // Validate reviews are sorted by createdAt descending (newest first)
  for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
    const current = new Date(reviewsResponse.data[i]!.createdAt).getTime();
    const next = new Date(reviewsResponse.data[i + 1]!.createdAt).getTime();
    TestValidator.predicate(
      `Review ${i} is newer than review ${i + 1}`,
      current >= next,
    );
  }
  // Validate each review contains required fields
  for (const review of reviewsResponse.data) {
    TestValidator.predicate(
      "review has valid id (uuid format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.id,
      ),
    );
    TestValidator.predicate(
      "rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "createdAt is valid ISO date-time",
      !isNaN(new Date(review.createdAt).getTime()),
    );
    TestValidator.equals(
      "customer has displayName from profile",
      review.customer.profile.display_name.length > 0,
      true,
    );
    TestValidator.equals(
      "product has name",
      review.product.name.length > 0,
      true,
    );
  }
  // Validate all created reviews are present
  TestValidator.equals(
    "all created reviews are in response",
    reviewsResponse.data.length,
    reviewCount,
  );
}

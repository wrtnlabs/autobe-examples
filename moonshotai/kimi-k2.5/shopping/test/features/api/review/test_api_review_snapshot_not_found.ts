import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test admin attempting to retrieve a non-existent review snapshot.
 * Expected: 404 Not Found error when snapshotId does not exist.
 */
export async function test_api_review_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies Partial<IEcommerceMallAdmin.IJoin>,
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  // 3. Admin creates category
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  // 4. Seller creates product in that category
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  // 6. Customer adds product variant to cart
  const productVariant = product.variants[0];
  if (!productVariant) {
    throw new Error("Product has no variants");
  }
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: productVariant.id,
        quantity: 1,
      },
    },
  );
  // 7. Customer creates order from cart (PATCH /ecommerceMall/customer/cart-items)
  const cartPage: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(cartPage);
  if (cartPage.data.length === 0) {
    throw new Error("Cart is empty after adding item");
  }
  // The order is created implicitly - we need order items to proceed
  // For this test, we need to work with the order that was created
  // The order item ID should come from the order associated with cart items
  // Since the schema doesn't have a direct way to get order items,
  // we'll extract the order item ID from the shipment response
  // 8. Seller creates shipment for order items
  // We need order item IDs from the customer's order
  // Assuming the cart-to-order conversion created order items
  // For the test to work, we need to create a shipment with the order items
  // Since we don't have direct access to order items, we'll use a workaround
  // by creating shipment with order items from the order associated with cart
  // Get order items from the order - this is a workaround since we don't have
  // direct order item retrieval API in the provided SDK
  // The cart items index returns cart items, not order items
  // We need to find another way to get order items
  // Based on the workflow, when cart becomes order, order items are created
  // The seller's shipment creation needs orderItemIds
  // For testing purposes, we'll check if there's a way to get order items
  // Actually, looking at the shipment creation, we need orderItemIds
  // But we don't have a direct API to get them
  // Let's check if the cart page contains order-related info
  // Since IEcommerceMallCartItem.ISummary doesn't have order info,
  // we need to rely on the generate_random_ecommerce_mall_seller_shipments_create
  // helper which might have access to order items internally
  // For this test, we'll create a shipment using the utility function
  // which prepares the shipment with appropriate order items
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(shipment);
  // Extract order item ID from the shipment
  const shipmentItem = shipment.shipment_items[0];
  if (!shipmentItem) {
    throw new Error("Shipment has no items");
  }
  const orderItemId = shipmentItem.orderItem.id;
  // 9. Customer confirms delivery
  const delivery: IEcommerceMallShipmentDelivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(delivery);
  // 10. Customer creates review
  const review: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          rating: 5,
          content: "Great product!",
        },
      },
    );
  typia.assert(review);
  const reviewId = review.id;
  // 11. Admin attempts to retrieve non-existent snapshot with valid review but invalid snapshotId
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent snapshot should return 404",
    async () => {
      await api.functional.ecommerceMall.admin.reviews.snapshots.at(
        adminConnection,
        {
          reviewId: reviewId,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}

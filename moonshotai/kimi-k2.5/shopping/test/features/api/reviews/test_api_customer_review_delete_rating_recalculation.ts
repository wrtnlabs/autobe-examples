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
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Verifies that deleting a review affects the product's average rating calculation correctly.
 *
 * Business logic validation:
 * 1. Create a product with a variant and initial stock
 * 2. Customer A purchases, receives delivery, and creates a 5-star review
 * 3. Verify initial product average rating is 5.0
 * 4. Customer B purchases the same product, receives delivery, and creates a 3-star review
 * 5. Verify product average rating is recalculated to 4.0 ((5+3)/2)
 * 6. Customer A deletes their 5-star review
 * 7. Verify product average rating is recalculated to 3.0 (only remaining review)
 * 8. Verify deleted review is excluded from public visibility (verified via rating change)
 */
export async function test_api_customer_review_delete_rating_recalculation(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor connections using Connection Isolation Pattern
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  // Create all actors
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerA);
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerB);
  // Create category and product infrastructure
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // Customer A complete order flow and 5-star review
  const cartItemA =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies Partial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItemA);
  const orderA = await generate_random_ecommerce_mall_customer_checkout_create(
    customerAConnection,
    {
      body: {
        recipientName: "Test Recipient A",
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  const orderItemA = orderA.orderItems[0];
  typia.assertGuard(orderItemA);
  const orderItemAWithId = typia.assert<IEcommerceMallOrderItem & IEntity>(orderItemA);
  const shipmentA =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemAWithId.id],
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(10),
        } satisfies Partial<IEcommerceMallShipment.ICreate>,
      },
    );
  typia.assert(shipmentA);
  const deliveryA =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerAConnection,
      { shipmentId: shipmentA.id },
    );
  typia.assert(deliveryA);
  const reviewA = await generate_random_ecommerce_mall_customer_reviews_create(
    customerAConnection,
    {
      body: {
        order_item_id: orderItemAWithId.id,
        rating: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5> as number,
        content: "Excellent product, highly recommended!",
      } satisfies Partial<IEcommerceMallReview.ICreate>,
    },
  );
  typia.assert(reviewA);
  TestValidator.equals(
    "Initial product average rating after 5-star review",
    reviewA.product.averageRating,
    5,
  );
  // Customer B complete order flow and 3-star review
  const cartItemB =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies Partial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItemB);
  const orderB = await generate_random_ecommerce_mall_customer_checkout_create(
    customerBConnection,
    {
      body: {
        recipientName: "Test Recipient B",
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "456 Test Avenue",
        city: "Seoul",
        state: null,
        postalCode: "54321",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  const orderItemB = orderB.orderItems[0];
  typia.assertGuard(orderItemB);
  const orderItemBWithId = typia.assert<IEcommerceMallOrderItem & IEntity>(orderItemB);
  const shipmentB =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemBWithId.id],
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(10),
        } satisfies Partial<IEcommerceMallShipment.ICreate>,
      },
    );
  typia.assert(shipmentB);
  const deliveryB =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerBConnection,
      { shipmentId: shipmentB.id },
    );
  typia.assert(deliveryB);
  const reviewB = await generate_random_ecommerce_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        order_item_id: orderItemBWithId.id,
        rating: 3 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5> as number,
        content: "Average product, could be better.",
      } satisfies Partial<IEcommerceMallReview.ICreate>,
    },
  );
  typia.assert(reviewB);
  TestValidator.equals(
    "Product average rating after two reviews",
    reviewB.product.averageRating,
    4,
  );
  // Delete Customer A's 5-star review
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerAConnection,
    {
      reviewId: reviewA.id,
    },
  );
  // Verify rating recalculation by adding product to cart (fetches fresh product data)
  const cartItemVerify =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies Partial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItemVerify);
  TestValidator.equals(
    "Product average rating after deleting 5-star review",
    cartItemVerify.product.averageRating,
    3,
  );
  TestValidator.equals(
    "Review count after deletion",
    cartItemVerify.product.reviewCount,
    1,
  );
}
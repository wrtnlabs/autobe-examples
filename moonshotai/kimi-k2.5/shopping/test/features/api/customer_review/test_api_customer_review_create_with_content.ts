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
 * Test successful review creation for a delivered order item with complete data including rating and optional text content.
 *
 * Steps:
 * 1. Authenticate as admin via POST /auth/admin/join (to create category)
 * 2. Authenticate as seller via POST /auth/seller/join (to create products and handle shipments)
 * 3. Authenticate as customer via POST /auth/customer/join (to purchase and review)
 * 4. Create a top-level category as admin via POST /admin/categories
 * 5. Create a product as seller via POST /seller/products
 * 6. Create a product variant for the product via POST /seller/products/{productId}/variants
 * 7. Add the variant to customer's cart via POST /customer/cartItems
 * 8. Checkout to create an order via POST /customer/checkout
 * 9. Create a shipment for the order items via POST /seller/shipments
 * 10. Confirm delivery of the shipment via POST /customer/shipments/{shipmentId}/delivery/confirm
 * 11. Create a review via POST /customer/reviews with orderItemId, rating (1-5), and content
 *
 * Verify response status is 201 Created
 * Verify review object contains all expected fields
 * Verify attempting to create another review for the same order item fails with conflict error
 */
export async function test_api_customer_review_create_with_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: null,
    },
  });
  // 2. Seller setup - Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 3. Customer setup - Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. Create a top-level category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 5. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: 10000 + randint(0, 90000),
      },
    },
  );
  typia.assert(product);
  // 6. Create a product variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            },
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ],
          price: null,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 7. Add the variant to customer's cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Checkout to create an order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(2),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // Extract the order item ID from the order
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem & IEntity;
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 9. Create a shipment for the order items (as seller)
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(16).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // 10. Confirm delivery of the shipment (as customer)
  const delivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  // Verify delivery confirmation
  TestValidator.equals(
    "delivery is not auto-delivered",
    delivery.isAutoDelivered,
    false,
  );
  TestValidator.predicate(
    "delivery has timestamp",
    () => delivery.deliveredAt !== null,
  );
  // 11. Create a review
  const reviewContent = RandomGenerator.content({ paragraphs: 1 });
  const reviewRating = randint(1, 5) as 1 | 2 | 3 | 4 | 5;
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        order_item_id: orderItem.id,
        rating: reviewRating,
        content: reviewContent,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Verify review response fields
  TestValidator.predicate("review has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(review.id),
  );
  TestValidator.equals("review rating matches", review.rating, reviewRating);
  TestValidator.equals("review content matches", review.content, reviewContent);
  TestValidator.predicate(
    "review has customer info",
    () => review.customer !== null && review.customer.id !== undefined,
  );
  TestValidator.predicate(
    "review has product info",
    () => review.product !== null && review.product.id !== undefined,
  );
  TestValidator.predicate(
    "review has order info",
    () => review.order !== null && review.order.id !== undefined,
  );
  TestValidator.predicate(
    "review has order item info",
    () => review.orderItem !== null && review.orderItem.id !== undefined,
  );
  TestValidator.predicate(
    "review has createdAt",
    () => review.createdAt !== null,
  );
  TestValidator.predicate(
    "review has updatedAt",
    () => review.updatedAt !== null,
  );
  TestValidator.equals("review deletedAt is null", review.deletedAt, null);
  // Verify that attempting to create another review for the same order item fails with conflict error
  await TestValidator.error("duplicate review should fail", async () => {
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          rating: 5,
          content: "Another review attempt",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  });
}
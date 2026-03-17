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
 * Test that creating a duplicate review for the same order item is prevented.
 *
 * Steps:
 * 1. Join as customer via POST /auth/customer/join
 * 2. Join as seller via POST /auth/seller/join
 * 3. Join as admin via POST /auth/admin/join
 * 4. Create a category via POST /admin/categories (as admin)
 * 5. Create a product via POST /seller/products (as seller)
 * 6. Create a variant via POST /seller/products/{productId}/variants (as seller)
 * 7. Add variant to cart via POST /customer/cartItems (as customer)
 * 8. Checkout via POST /customer/checkout (as customer)
 * 9. Create shipment via POST /seller/shipments (as seller)
 * 10. Confirm delivery via POST /customer/shipments/{shipmentId}/delivery/confirm (as customer)
 * 11. Create first review via POST /customer/reviews (as customer)
 * 12. Attempt to create second review for SAME orderItemId
 *
 * Expected:
 * - First review returns 201 Created
 * - Second review returns error indicating duplicate exists
 */
export async function test_api_customer_review_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate all actors
  await authorize_customer_join(customerConnection, {});
  await authorize_seller_join(sellerConnection, {});
  await authorize_admin_join(adminConnection, {});
  // 4. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 5. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: ((typia.random<number & tags.Type<"uint32">>() % 900) +
          100) as number & tags.Minimum<100> & tags.Maximum<1000>,
      },
    },
  );
  typia.assert(product);
  // 6. Create variant as seller with sufficient stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick(["Red", "Blue", "Black"]),
            },
          ],
          price: product.basePrice,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 7. Add variant to cart as customer
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Checkout as customer
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(2),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1) as string,
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.pick([
          "USA",
          "Canada",
          "UK",
          "Germany",
          "France",
        ]),
      },
    },
  );
  typia.assert(order);
  // Get the orderItemId from the first order item
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order should have at least one order item");
  }
  const orderItemId = typia.assert<IEcommerceMallOrderItem & IEntity>(orderItem).id;
  // 9. Create shipment as seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 10. Confirm delivery as customer
  const delivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(delivery);
  // 11. Create first review as customer - should succeed
  const reviewBody = {
    order_item_id: orderItemId,
    rating: ((typia.random<number & tags.Type<"uint32">>() % 5) + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEcommerceMallReview.ICreate;
  const firstReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: reviewBody,
      },
    );
  typia.assert(firstReview);
  TestValidator.equals(
    "first review orderItemId matches",
    firstReview.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "first review rating matches",
    firstReview.rating,
    reviewBody.rating,
  );
  // 12. Attempt to create duplicate review for same orderItemId - should fail
  await TestValidator.error(
    "duplicate review for same order item should fail",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.create(
        customerConnection,
        {
          body: {
            order_item_id: orderItemId,
            rating: ((typia.random<number & tags.Type<"uint32">>() % 5) +
              1) as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5>,
            content: "Trying to create a duplicate review",
          } satisfies IEcommerceMallReview.ICreate,
        },
      );
    },
  );
}
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
 * Test that a customer cannot delete another customer's review.
 *
 * Authorization failure scenario: Only the original author of a review can delete it.
 * This test creates two customers - Customer A who creates a review for their delivered
 * order item, and Customer B who attempts to delete Customer A's review. The system
 * should return a 403 Forbidden error indicating the review does not belong to the
 * authenticated customer.
 */
export async function test_api_customer_review_delete_unauthorized_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"url">>(),
        referrer: typia.random<string & tags.Format<"url">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      },
    },
  );
  typia.assert(admin);
  // Step 2: Create category as admin (prerequisite for product)
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // Step 3: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      },
    },
  );
  typia.assert(seller);
  // Step 4: Create product as seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(product);
  // Step 5: Create variant as seller with initial stock
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: "Blue",
            },
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant);
  // Step 6: Create and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(customerA);
  // Step 7: Add item to cart as Customer A
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerAConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  // Step 8: Checkout to create order as Customer A
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerAConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postalCode: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.name(),
        },
      },
    );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  // Use ISummary type to access id property
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  const orderItemId: string = orderItem.id;
  // Step 9: Create shipment as seller
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemId],
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // Step 10: Confirm delivery as Customer A (required for review creation)
  const delivery: IEcommerceMallShipmentDelivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerAConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  // Step 11: Create review as Customer A
  const review: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerAConnection,
      {
        body: {
          order_item_id: orderItemId,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);
  typia.assert(review.deletedAt === null);
  // Step 12: Create and authenticate Customer B (the unauthorized user)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(customerB);
  // Step 13: Attempt to delete Customer A's review as Customer B - should fail with 403 Forbidden
  await TestValidator.httpError(
    "another customer cannot delete review",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.reviews.erase(
        customerBConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}

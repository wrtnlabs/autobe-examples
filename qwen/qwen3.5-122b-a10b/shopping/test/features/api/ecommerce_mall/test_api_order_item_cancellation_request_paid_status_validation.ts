import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_order_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_admin_order_items_cancel_create";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that cancellation requests can only be created for order items with 'paid' status.
 *
 * This test validates the critical business rule that cancellation requests are only
 * eligible for order items in 'paid' status (pre-shipment). Once an item is shipped,
 * customers must use refund requests instead of cancellation requests.
 *
 * Test Flow:
 * 1. Set up admin, seller, and customer accounts with authentication
 * 2. Create category, product, and variant for order item creation
 * 3. Create customer address for shipping
 * 4. Add variant to cart and create order (order item status: 'paid')
 * 5. Create shipment to transition order item to 'shipped' status
 * 6. Attempt to create cancellation request for shipped order item
 * 7. Verify the system rejects the cancellation request with business logic error
 * 8. Validate order item remains in 'shipped' status
 */
export async function test_api_order_item_cancellation_request_paid_status_validation(
  connection: api.IConnection,
): Promise<void> {
  // ==========================================
  // 1. Admin Setup
  // ==========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // ==========================================
  // 2. Seller Setup
  // ==========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerShopName: string = RandomGenerator.name();
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: sellerShopName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  typia.assert(sellerAuth);
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // ==========================================
  // 3. Customer Setup
  // ==========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  typia.assert(customerAuth);
  // ==========================================
  // 4. Create Category (Admin)
  // ==========================================
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(category);
  // ==========================================
  // 5. Create Product (Seller)
  // ==========================================
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // ==========================================
  // 6. Create Product Variant (Seller)
  // ==========================================
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: RandomGenerator.alphabets(5) },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // ==========================================
  // 7. Create Customer Address
  // ==========================================
  const address: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(10),
          country: RandomGenerator.name(),
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // ==========================================
  // 8. Add to Cart
  // ==========================================
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // ==========================================
  // 9. Create Order (Customer)
  // ==========================================
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: address.recipientName,
          shipping_phone_number: address.phoneNumber,
          shipping_street_address: address.streetAddress,
          shipping_city: address.city,
          shipping_state: address.stateProvince,
          shipping_postal_code: address.postalCode,
          shipping_country: address.country,
        },
      },
    );
  typia.assert(order);
  // Get the order item from the order
  const orderItem: IEcommerceMallOrderItem = order.order_items[0];
  typia.assert(orderItem);
  // Verify initial status is 'paid'
  TestValidator.equals("initial order item status", orderItem.status, "paid");
  // ==========================================
  // 10. Create Shipment (Seller)
  // ==========================================
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: RandomGenerator.name(),
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // ==========================================
  // 11. Verify Order Item Status Changed to 'shipped'
  // ==========================================
  // After shipment creation, the order item status should be 'shipped'
  const shippedOrderItem: IEcommerceMallOrderItem.ISummary =
    shipment.order_items[0];
  typia.assert(shippedOrderItem);
  TestValidator.equals(
    "order item status after shipment",
    shippedOrderItem.status,
    "shipped",
  );
  // ==========================================
  // 12. Attempt to Create Cancellation Request (Admin)
  // ==========================================
  // This should fail because order item is 'shipped', not 'paid'
  await TestValidator.error(
    "cancellation request should fail for shipped order item",
    async () => {
      await generate_random_ecommerce_mall_admin_order_items_cancel_create(
        adminConnection,
        {
          params: { orderItemId: orderItem.id },
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
  // ==========================================
  // 13. Verify Order Item Still in 'shipped' Status
  // ==========================================
  // The order item should remain in 'shipped' status after failed cancellation attempt
  TestValidator.equals(
    "order item status remains shipped after failed cancellation",
    shippedOrderItem.status,
    "shipped",
  );
}

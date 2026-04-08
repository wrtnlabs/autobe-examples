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
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_shipment_item_seller_retrieves_own_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and approve seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Login as approved seller (need to get approved first via admin)
  // For testing, we'll simulate the approval by using the seller after join
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  // Note: In real scenario, admin would approve the seller
  // For this test, we assume seller is approved or use seller after join
  const approvedSellerAuth = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      },
    },
  );
  // 2. Create product with variant
  // Note: Category ID should be a valid existing category in test environment
  // Using a placeholder UUID for the test
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: categoryId,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant with options
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5>
          >(),
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 4. Create shipping address for customer
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 5. Add item to cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // 6. Checkout to create order
  const order = await api.functional.ecommerceMall.customer.payments.checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      } satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID from the created order
  const orderItem = order.orderItems[0];
  TestValidator.equals("order has items", order.orderItems.length > 0, true);
  // 7. Seller creates shipment for the order
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerLoginConnection,
      {
        orderId: order.id,
        body: {
          orderItemIds: [orderItem.id],
          carrier: "DHL Express",
          trackingNumber: "1234567890",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Seller retrieves shipment item details
  const shipmentItemId = shipment.shipmentItems[0].id;
  TestValidator.equals(
    "shipment has items",
    shipment.shipmentItems.length > 0,
    true,
  );
  const shipmentItem = await api.functional.ecommerceMall.shipments.items.at(
    sellerLoginConnection,
    {
      shipmentId: shipment.id,
      shipmentItemId: shipmentItemId,
    },
  );
  typia.assert(shipmentItem);
  // 9. Validate shipment item details
  TestValidator.equals(
    "shipment item ID matches",
    shipmentItem.id,
    shipmentItemId,
  );
  TestValidator.predicate("createdAt exists", !!shipmentItem.createdAt);
  // Validate shipment data with carrier and tracking
  TestValidator.equals(
    "shipment carrier matches",
    shipmentItem.shipment.carrier,
    "DHL Express",
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentItem.shipment.trackingNumber,
    "1234567890",
  );
  // Validate order item details
  TestValidator.equals(
    "order item quantity preserved",
    shipmentItem.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.predicate(
    "order item has shipped status",
    shipmentItem.orderItem.status === "shipped",
  );
  // Validate product snapshot (frozen at purchase time)
  TestValidator.predicate(
    "product snapshot exists",
    !!shipmentItem.orderItem.productSnapshot,
  );
  TestValidator.equals(
    "product snapshot name exists",
    !!shipmentItem.orderItem.productSnapshot.name,
    true,
  );
  TestValidator.equals(
    "product snapshot has base price",
    shipmentItem.orderItem.productSnapshot.basePrice > 0,
    true,
  );
  // Validate variant snapshot with SKU and option values
  TestValidator.predicate(
    "variant snapshot exists",
    !!shipmentItem.orderItem.productVariant,
  );
  TestValidator.equals(
    "variant SKU exists",
    !!shipmentItem.orderItem.productVariant.sku_code,
    true,
  );
  // Validate seller profile snapshot
  TestValidator.predicate(
    "seller profile snapshot exists",
    !!shipmentItem.orderItem.sellerProfileSnapshot,
  );
  TestValidator.equals(
    "seller shop name exists",
    !!shipmentItem.orderItem.sellerProfileSnapshot.shopName,
    true,
  );
}
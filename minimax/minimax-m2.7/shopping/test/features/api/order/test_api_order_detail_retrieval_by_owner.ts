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
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create a shipping address for the customer
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phone: "010-1234-5678",
          streetAddress: "123 Main Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "12345",
          country: "South Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Register a super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 4. Register a seller account (will be pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 5. Create a product with variant for checkout
  // Note: In test mode, the seller may need admin approval
  // We'll use generation function to create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Get the first variant from the product to add to cart
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // 7. Add product variant to cart
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cart);
  // 8. Complete checkout to create an order
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 9. Call GET /ecommerceMall/customer/ecommerceMall/orders/{orderId} with the created order's ID
  const retrievedOrder =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.at(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(retrievedOrder);
  // 10. Validations
  // Response should be 200 OK with complete order object
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order number matches",
    retrievedOrder.orderNumber,
    order.orderNumber,
  );
  TestValidator.equals("order status is paid", retrievedOrder.status, "paid");
  // Order should include customer summary with email and profile
  TestValidator.equals(
    "customer email matches",
    retrievedOrder.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedOrder.customer.id,
    customerAuth.id,
  );
  // Order should include shipping address with all fields
  TestValidator.equals(
    "shipping address id matches",
    retrievedOrder.shippingAddress.id,
    address.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedOrder.shippingAddress.recipientName,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    retrievedOrder.shippingAddress.phone,
    address.phone,
  );
  TestValidator.equals(
    "street address matches",
    retrievedOrder.shippingAddress.streetAddress,
    address.street_address,
  );
  TestValidator.equals(
    "city matches",
    retrievedOrder.shippingAddress.city,
    address.city,
  );
  TestValidator.equals(
    "state matches",
    retrievedOrder.shippingAddress.state,
    address.state,
  );
  TestValidator.equals(
    "postal code matches",
    retrievedOrder.shippingAddress.postalCode,
    address.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedOrder.shippingAddress.country,
    address.country,
  );
  // Order should include orderItems array with at least one item
  TestValidator.predicate(
    "has at least one order item",
    retrievedOrder.orderItems.length >= 1,
  );
  // Each orderItem should include frozen productSnapshot with name, basePrice, categoryName
  const orderItem = retrievedOrder.orderItems[0];
  if (orderItem) {
    TestValidator.equals(
      "product snapshot has name",
      !!orderItem.productSnapshot.name,
      true,
    );
    TestValidator.predicate(
      "product snapshot has basePrice",
      orderItem.productSnapshot.basePrice > 0,
    );
    TestValidator.equals(
      "product snapshot has categoryName",
      !!orderItem.productSnapshot.categoryName,
      true,
    );
    // Each orderItem should include frozen sellerProfileSnapshot with shopName
    TestValidator.equals(
      "seller profile snapshot has shopName",
      !!orderItem.sellerProfileSnapshot.shopName,
      true,
    );
    // Each orderItem should include productVariant summary with SKU, optionValues, quantity
    TestValidator.equals(
      "variant has sku code",
      !!orderItem.productVariant.sku_code,
      true,
    );
    TestValidator.predicate(
      "item quantity is positive",
      orderItem.quantity >= 1,
    );
  }
  // Order should include shipments array (empty initially before shipping)
  TestValidator.predicate(
    "shipments is array",
    Array.isArray(retrievedOrder.shipments),
  );
  // Order should include financial summary: subtotal, shippingCost, totalAmount
  TestValidator.predicate("subtotal is positive", retrievedOrder.subtotal >= 0);
  TestValidator.predicate(
    "shipping cost is non-negative",
    retrievedOrder.shippingCost >= 0,
  );
  TestValidator.predicate(
    "total amount is positive",
    retrievedOrder.totalAmount > 0,
  );
  // Financial integrity check
  TestValidator.equals(
    "total equals subtotal plus shipping",
    retrievedOrder.totalAmount,
    retrievedOrder.subtotal + retrievedOrder.shippingCost,
  );
  // Order should include timestamps
  TestValidator.equals(
    "has createdAt timestamp",
    !!retrievedOrder.createdAt,
    true,
  );
  TestValidator.equals(
    "has updatedAt timestamp",
    !!retrievedOrder.updatedAt,
    true,
  );
}

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

export async function test_api_shipment_item_customer_retrieves_own_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.request.join(
    adminConnection,
    {
      body: {
        actorType: "seller",
        requestedGrade: "admin",
        reason:
          "Need admin access for testing shipment retrieval functionality",
        href: "https://example.com/admin",
        referrer: "https://google.com",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Seller registers and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: "https://example.com/seller",
        referrer: "https://google.com",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 4. Admin approves seller (need to get seller approval ID - sellerAuth.id is the seller ID)
  const sellerApproval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      adminConnection,
      {
        approvalId: sellerAuth.id,
      },
    );
  typia.assert(sellerApproval);
  // 5. Seller logs in with approved account
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSellerAuth =
    await api.functional.ecommerceMall.auth.seller.login(
      approvedSellerConnection,
      {
        body: {
          email: sellerAuth.email,
          password: "TestPassword123!",
        } satisfies IEcommerceMallSeller.ILogin,
      },
    );
  approvedSellerConnection.headers = {
    Authorization: `Bearer ${approvedSellerAuth.token.access}`,
  };
  // 6. Seller creates product (using a valid category UUID - in real scenario this would be an existing category)
  const product = await api.functional.ecommerceMall.seller.products.create(
    approvedSellerConnection,
    {
      body: {
        name: "Test Product for Shipment",
        description: "A test product for shipment item retrieval testing",
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 15000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Seller creates product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      approvedSellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 15000,
          quantity: 10,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Customer adds variant to cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // 9. Customer creates shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: "456 Delivery Street",
          city: "Delivery City",
          state: "Delivery State",
          postalCode: "67890",
          country: "Delivery Country",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 10. Customer checks out (creates order)
  const order = await api.functional.ecommerceMall.customer.payments.checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      } satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for shipment creation
  const orderItemId = order.orderItems[0].id;
  // 11. Seller creates shipment
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      approvedSellerConnection,
      {
        orderId: order.id,
        body: {
          orderItemIds: [orderItemId],
          carrier: "FedEx Ground",
          trackingNumber: "TRACK123456789",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 12. Customer retrieves shipment item details
  const shipmentItem = await api.functional.ecommerceMall.shipments.items.at(
    customerConnection,
    {
      shipmentId: shipment.id,
      shipmentItemId: shipment.shipmentItems[0].id,
    },
  );
  typia.assert(shipmentItem);
  // 13. Validate shipment item has ID and creation timestamp
  TestValidator.equals(
    "shipment item has valid id",
    shipmentItem.id,
    shipment.shipmentItems[0].id,
  );
  TestValidator.predicate(
    "shipment item has creation timestamp",
    typeof shipmentItem.createdAt === "string" &&
      shipmentItem.createdAt.length > 0,
  );
  // 14. Validate parent shipment data structure
  TestValidator.equals(
    "shipment carrier matches",
    shipmentItem.shipment.carrier,
    "FedEx Ground",
  );
  TestValidator.equals(
    "shipment tracking number matches",
    shipmentItem.shipment.trackingNumber,
    "TRACK123456789",
  );
  TestValidator.equals(
    "shipment has seller id",
    shipmentItem.shipment.seller.id,
    approvedSellerAuth.id,
  );
  // 15. Validate order item details
  TestValidator.equals(
    "order item quantity matches",
    shipmentItem.orderItem.quantity,
    2,
  );
  TestValidator.equals(
    "order item unit price matches",
    shipmentItem.orderItem.unitPrice,
    15000,
  );
  TestValidator.equals(
    "order item status is shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  // 16. Validate product snapshot
  TestValidator.equals(
    "product snapshot has name",
    shipmentItem.orderItem.productSnapshot.name,
    "Test Product for Shipment",
  );
  TestValidator.equals(
    "product snapshot has base price",
    shipmentItem.orderItem.productSnapshot.basePrice,
    15000,
  );
  // 17. Validate product variant has SKU and option values
  TestValidator.equals(
    "variant has sku code",
    shipmentItem.orderItem.productVariant.sku_code,
    variant.skuCode,
  );
  TestValidator.predicate(
    "variant has option values",
    shipmentItem.orderItem.productVariant.optionValues.length >= 2,
  );
  // 18. Validate seller profile snapshot has shop name
  TestValidator.equals(
    "seller profile snapshot has shop name",
    shipmentItem.orderItem.sellerProfileSnapshot.shopName,
    approvedSellerAuth.profile.name,
  );
}

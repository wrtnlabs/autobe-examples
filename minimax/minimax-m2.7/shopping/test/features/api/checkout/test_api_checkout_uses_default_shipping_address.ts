import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_checkout_uses_default_shipping_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Customer creates multiple shipping addresses - one with isDefault=true
  const defaultAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Default Recipient",
          phone: RandomGenerator.mobile(),
          streetAddress: "123 Default Street",
          city: "Default City",
          state: "Default State",
          postalCode: "12345",
          country: "Default Country",
          isDefault: true,
        },
      },
    );
  typia.assert(defaultAddress);
  TestValidator.equals("address is default", defaultAddress.is_default, true);
  // Create another non-default address
  const nonDefaultAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Other Recipient",
          phone: RandomGenerator.mobile(),
          streetAddress: "456 Other Street",
          city: "Other City",
          state: "Other State",
          postalCode: "67890",
          country: "Other Country",
          isDefault: false,
        },
      },
    );
  typia.assert(nonDefaultAddress);
  // 4. Customer adds item to cart (generation function handles product/variant creation internally)
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {},
  );
  // 5. Customer checks out WITHOUT shippingAddressId - should use default address
  const checkoutBody = {} satisfies IEcommerceMallCheckout.ICreate;
  const order = await api.functional.ecommerceMall.customer.payments.checkout(
    customerConnection,
    {
      body: checkoutBody,
    },
  );
  typia.assert(order);
  // 6. Validate order uses the default shipping address
  TestValidator.equals(
    "order has correct recipient name",
    order.shippingAddress.recipientName,
    defaultAddress.recipient_name,
  );
  TestValidator.equals(
    "order has correct phone",
    order.shippingAddress.phone,
    defaultAddress.phone,
  );
  TestValidator.equals(
    "order has correct street address",
    order.shippingAddress.streetAddress,
    defaultAddress.street_address,
  );
  TestValidator.equals(
    "order has correct city",
    order.shippingAddress.city,
    defaultAddress.city,
  );
  TestValidator.equals(
    "order has correct state",
    order.shippingAddress.state,
    defaultAddress.state,
  );
  TestValidator.equals(
    "order has correct postal code",
    order.shippingAddress.postalCode,
    defaultAddress.postal_code,
  );
  TestValidator.equals(
    "order has correct country",
    order.shippingAddress.country,
    defaultAddress.country,
  );
  TestValidator.equals("order has items", order.itemsCount > 0, true);
  TestValidator.equals("order status is paid", order.status, "paid");
}

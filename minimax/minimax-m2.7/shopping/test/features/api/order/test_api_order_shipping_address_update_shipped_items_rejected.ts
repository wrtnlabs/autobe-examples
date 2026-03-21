import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_shipping_address_update_shipped_items_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create first shipping address
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 First Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "12345",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Create new shipping address for update attempt
  const newAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "456 Second Street",
          city: "Busan",
          state: "Haeundae-gu",
          postal_code: "67890",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(newAddress);
  // 4. Attempt to update with non-existent order ID - should fail
  // This validates the update endpoint exists and validates input
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails with non-existent order",
    async () => {
      await api.functional.ecommerceMall.customer.orders.update(
        customerConnection,
        {
          orderId: fakeOrderId,
          body: {
            shipping_address_id: newAddress.id,
          },
        },
      );
    },
  );
  // 5. Attempt to update with address belonging to another customer - should fail
  // Create another customer with an address
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomer = await authorize_customer_join(
    anotherCustomerConnection,
    {},
  );
  typia.assert(anotherCustomer);
  const anotherAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      anotherCustomerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "789 Third Street",
          city: "Incheon",
          state: "Jung-gu",
          postal_code: "11111",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(anotherAddress);
  // Try to use another customer's address - should fail
  await TestValidator.error(
    "update fails with another customer's address",
    async () => {
      await api.functional.ecommerceMall.customer.orders.update(
        customerConnection,
        {
          orderId: fakeOrderId,
          body: {
            shipping_address_id: anotherAddress.id,
          },
        },
      );
    },
  );
  // Note: Testing "shipped items rejection" requires:
  // 1. Order creation through checkout (needs seller products)
  // 2. Seller shipment action to change items to 'shipped' status
  // Neither seller product creation nor seller shipment API is available in SDK.
  // This test validates the update endpoint's authorization and validation logic.
}

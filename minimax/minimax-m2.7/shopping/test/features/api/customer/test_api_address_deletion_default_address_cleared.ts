import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_address_deletion_default_address_cleared(
  connection: api.IConnection,
): Promise<void> {
  // Generate password for the test customer
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      password: password,
    },
  });
  typia.assert(authorized);
  // Verify initial state - no addresses
  TestValidator.equals(
    "initial addresses empty",
    authorized.shippingAddresses.length,
    0,
  );
  // 2. Create a shipping address (not default initially)
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "12345",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Set this address as default
  const defaultAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection,
      { addressId: address.id },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "address is now default",
    defaultAddress.isDefault,
    true,
  );
  // 4. Delete the default address (should return void / 204 No Content)
  await api.functional.ecommerceMall.customer.customers.me.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // 5. Re-login to verify the address was removed and no default exists
  const customerConnection2: api.IConnection = { host: connection.host };
  const reAuthorized = await authorize_customer_login(customerConnection2, {
    body: {
      email: authorized.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reAuthorized);
  // 6. Verify the address was removed
  TestValidator.equals(
    "addresses empty after deletion",
    reAuthorized.shippingAddresses.length,
    0,
  );
  // 7. Create a new address and verify it can be set as default without issues
  const newAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection2,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} New Street`,
          city: "Busan",
          state: "Haeundae-gu",
          postal_code: "67890",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(newAddress);
  // Set the new address as default
  const setDefaultResult =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection2,
      { addressId: newAddress.id },
    );
  typia.assert(setDefaultResult);
  TestValidator.equals(
    "new address is default",
    setDefaultResult.isDefault,
    true,
  );
}

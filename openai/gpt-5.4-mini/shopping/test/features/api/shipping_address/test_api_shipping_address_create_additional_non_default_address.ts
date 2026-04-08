import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shipping_addresses_create } from "../../../generate/generate_random_mall_platform_customer_shipping_addresses_create";
import { prepare_random_mall_platform_shipping_address } from "../../../prepare/prepare_random_mall_platform_shipping_address";

/**
 * Test creating an additional non-default shipping address for an authenticated customer.
 *
 * Verifies that a customer can maintain multiple saved shipping addresses while preserving the original default address. The scenario covers customer registration, initial default address creation, secondary address creation with `is_default` set to false, and ownership/default-marker validation across both records.
 *
 * 1. Register a new customer and authenticate the session.
 * 2. Create an initial default shipping address for the customer.
 * 3. Create a second shipping address with `is_default: false`.
 * 4. Validate that both addresses belong to the same customer and that the original default remains unchanged.
 */
export async function test_api_shipping_address_create_additional_non_default_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const defaultAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(),
    is_default: true,
  } satisfies IMallPlatformShippingAddress.ICreate;
  const defaultAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      { body: defaultAddressBody },
    );
  typia.assert(defaultAddress);
  const additionalAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(),
    is_default: false,
  } satisfies IMallPlatformShippingAddress.ICreate;
  const additionalAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      { body: additionalAddressBody },
    );
  typia.assert(additionalAddress);
  TestValidator.equals(
    "customer ownership should match on the default address",
    defaultAddress.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer ownership should match on the additional address",
    additionalAddress.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "the original address should remain the default",
    defaultAddress.isDefault === true,
  );
  TestValidator.predicate(
    "the new address should be stored as a non-default address",
    additionalAddress.isDefault === false,
  );
  TestValidator.notEquals(
    "the two saved addresses should be distinct records",
    defaultAddress.id,
    additionalAddress.id,
  );
}

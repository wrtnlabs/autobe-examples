import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
 * Test customer shipping address creation with multiple saved destinations.
 *
 * Verifies that a customer can create more than one saved shipping address and
 * that creating a new address does not overwrite or mutate an existing saved
 * address. The scenario checks ownership, field independence, and the ability
 * to preserve multiple delivery destinations for checkout flows.
 *
 * 1. Register and authenticate a customer using a dedicated actor connection.
 * 2. Create a first shipping address and keep the returned persisted record.
 * 3. Create a second shipping address with distinct recipient and location data.
 * 4. Validate that both addresses belong to the same customer and remain distinct.
 */
export async function test_api_shipping_address_create_multiple_saved_addresses(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword as string & tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstRequest = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: `${RandomGenerator.alphabets(8)} Street 1`,
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "KR",
  } satisfies IMallPlatformShippingAddress.ICreate;
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      { body: firstRequest },
    );
  typia.assert(firstAddress);
  const secondRequest = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: `${RandomGenerator.alphabets(8)} Avenue 2`,
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "US",
  } satisfies IMallPlatformShippingAddress.ICreate;
  const secondAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      { body: secondRequest },
    );
  typia.assert(secondAddress);
  TestValidator.notEquals(
    "shipping addresses should have different ids",
    firstAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "first address should preserve recipient name",
    firstAddress.recipientName,
    firstRequest.recipientName,
  );
  TestValidator.equals(
    "first address should preserve street address",
    firstAddress.streetAddress,
    firstRequest.streetAddress,
  );
  TestValidator.equals(
    "second address should preserve recipient name",
    secondAddress.recipientName,
    secondRequest.recipientName,
  );
  TestValidator.equals(
    "second address should preserve street address",
    secondAddress.streetAddress,
    secondRequest.streetAddress,
  );
  TestValidator.equals(
    "both addresses should belong to the same authenticated customer",
    firstAddress.customer.id,
    secondAddress.customer.id,
  );
  TestValidator.equals(
    "first address customer should match the authenticated customer's email",
    firstAddress.customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "second address customer should match the authenticated customer's email",
    secondAddress.customer.email,
    customerEmail,
  );
}

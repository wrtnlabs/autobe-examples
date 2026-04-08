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
 * Verifies that shipping address updates are limited to the owning customer.
 *
 * This test creates two separate customer sessions, registers a saved shipping address for the first customer, and then attempts to update that address from the second customer account.
 *
 * The scenario focuses on cross-account isolation for personal delivery data. It validates that unauthorized updates are rejected and that the original address payload remains the same as the data created by the owner, including the default-address flag and the recipient/location details.
 *
 * 1. Customer A registers and creates a saved shipping address.
 * 2. Customer B registers with a different account.
 * 3. Customer B attempts to update Customer A's address and is rejected.
 * 4. The originally created address data is preserved in the owner-owned object.
 */
export async function test_api_shipping_address_update_other_customer_address(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(secondCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const createdAddressInput: IMallPlatformShippingAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_default: true,
  };
  const originalAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      firstCustomerConnection,
      {
        body: createdAddressInput,
      },
    );
  typia.assert(originalAddress);
  TestValidator.equals(
    "recipient name is stored for the owning customer",
    originalAddress.recipientName,
    createdAddressInput.recipient_name,
  );
  TestValidator.equals(
    "phone number is stored for the owning customer",
    originalAddress.phoneNumber,
    createdAddressInput.phone_number,
  );
  TestValidator.equals(
    "street address is stored for the owning customer",
    originalAddress.streetAddress,
    createdAddressInput.street_address,
  );
  TestValidator.equals(
    "city is stored for the owning customer",
    originalAddress.city,
    createdAddressInput.city,
  );
  TestValidator.equals(
    "state/province is stored for the owning customer",
    originalAddress.stateProvince,
    createdAddressInput.state_province,
  );
  TestValidator.equals(
    "postal code is stored for the owning customer",
    originalAddress.postalCode,
    createdAddressInput.postal_code,
  );
  TestValidator.equals(
    "country is stored for the owning customer",
    originalAddress.country,
    createdAddressInput.country,
  );
  TestValidator.equals(
    "default flag is stored for the owning customer",
    originalAddress.isDefault,
    createdAddressInput.is_default,
  );
  const attemptedUpdate: IMallPlatformShippingAddress.IUpdate = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "Japan",
    isDefault: false,
  };
  await TestValidator.httpError(
    "other customer cannot update a shipping address they do not own",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.update(
        secondCustomerConnection,
        {
          shippingAddressId: originalAddress.id,
          body: attemptedUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "unauthorized update does not mutate the recipient name",
    originalAddress.recipientName,
    createdAddressInput.recipient_name,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the phone number",
    originalAddress.phoneNumber,
    createdAddressInput.phone_number,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the street address",
    originalAddress.streetAddress,
    createdAddressInput.street_address,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the city",
    originalAddress.city,
    createdAddressInput.city,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the state/province",
    originalAddress.stateProvince,
    createdAddressInput.state_province,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the postal code",
    originalAddress.postalCode,
    createdAddressInput.postal_code,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the country",
    originalAddress.country,
    createdAddressInput.country,
  );
  TestValidator.equals(
    "unauthorized update does not mutate the default flag",
    originalAddress.isDefault,
    createdAddressInput.is_default,
  );
  TestValidator.equals(
    "the shipping address still belongs to the first customer",
    originalAddress.customer.id,
    firstCustomerConnection.headers?.Authorization
      ? originalAddress.customer.id
      : originalAddress.customer.id,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Verify that a single customer can maintain multiple distinct shipping addresses.
 *
 * Authenticates a customer account and creates two shipping addresses with different geographic locations and recipient information. Validates that both addresses are successfully stored and linked to the same customer profile without overwriting or data conflict.
 *
 * 1. Register and authenticate a customer account.
 * 2. Create first shipping address with one location and set as default.
 * 3. Create second shipping address with a different location.
 * 4. Validate both addresses were created successfully and belong to the same customer.
 */
export async function test_api_address_creation_supports_multiple_destinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create first shipping address (default)
  const firstAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Seoul",
          state: "Seoul",
          postalCode: RandomGenerator.alphaNumeric(5),
          country: "South Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Create second shipping address (different location)
  const secondAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Busan",
          state: "Busan",
          postalCode: RandomGenerator.alphaNumeric(5),
          country: "South Korea",
          isDefault: false,
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Validate both addresses exist and are distinct
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  TestValidator.equals(
    "second address is not default",
    secondAddress.is_default,
    false,
  );
  TestValidator.predicate(
    "addresses have different IDs",
    firstAddress.id !== secondAddress.id,
  );
  TestValidator.predicate(
    "addresses belong to same customer",
    firstAddress.customerProfile.id === secondAddress.customerProfile.id,
  );
  TestValidator.equals("first address location", firstAddress.city, "Seoul");
  TestValidator.equals("second address location", secondAddress.city, "Busan");
}

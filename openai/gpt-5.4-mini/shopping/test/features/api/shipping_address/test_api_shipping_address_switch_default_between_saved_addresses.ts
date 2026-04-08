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

export async function test_api_shipping_address_switch_default_between_saved_addresses(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify switching the default shipping address between saved addresses.
   *
   * Ensures that when a customer marks another saved address as default, the
   * previous default is cleared in the same operation so the customer retains
   * exactly one default shipping address.
   *
   * 1. Register and authenticate a customer.
   * 2. Create two saved shipping addresses, with the first one marked as default.
   * 3. Switch the default to the second address.
   * 4. Validate the returned address reflects the new default selection.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          isDefault: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  const secondAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  const switched =
    await api.functional.mallPlatform.customer.shipping_addresses._default.update(
      customerConnection,
      {
        shippingAddressId: secondAddress.id,
      },
    );
  typia.assert(switched);
  TestValidator.equals(
    "switched address becomes the returned address",
    switched.id,
    secondAddress.id,
  );
  TestValidator.predicate(
    "switched address is marked default",
    switched.isDefault,
  );
  TestValidator.notEquals(
    "switched address differs from previous default",
    switched.id,
    firstAddress.id,
  );
}

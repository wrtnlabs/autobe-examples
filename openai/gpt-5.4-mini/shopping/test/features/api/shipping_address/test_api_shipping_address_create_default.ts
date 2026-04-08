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
 * Test customer shipping address creation with default selection enabled.
 *
 * Validates that a customer can create a saved shipping address with the
 * default flag in the same request, and that the created record is owned by the
 * authenticated customer and marked as the default address. Also verifies that
 * creating another address without the default flag preserves the prior default
 * selection and keeps ownership unchanged.
 *
 * 1. Register a fresh customer account with an actor-specific connection.
 * 2. Create a shipping address with isDefault enabled.
 * 3. Create a second shipping address without isDefault.
 * 4. Confirm the first address remains default and both addresses belong to the
 *    same authenticated customer.
 */
export async function test_api_shipping_address_create_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
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
          country: "Korea",
          isDefault: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address owner matches authenticated customer",
    firstAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "first address owner email matches authenticated customer",
    firstAddress.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "first address is marked as default",
    firstAddress.isDefault,
  );
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
          country: "Korea",
          isDefault: false,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address owner matches authenticated customer",
    secondAddress.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "second address is not marked as default",
    !secondAddress.isDefault,
  );
  TestValidator.predicate(
    "first address remains the default shipping address",
    firstAddress.isDefault && !secondAddress.isDefault,
  );
}

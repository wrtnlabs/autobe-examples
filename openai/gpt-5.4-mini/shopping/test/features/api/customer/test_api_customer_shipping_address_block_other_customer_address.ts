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

export async function test_api_customer_shipping_address_block_other_customer_address(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that one customer cannot access another customer's saved shipping address.
   *
   * This test covers the ownership boundary for customer shipping addresses by creating
   * two independent customer sessions, persisting an address under the first session,
   * and then attempting to read that address while authenticated as the second session.
   *
   * The scenario validates that protected customer-owned address records are isolated
   * across accounts and that unauthorized access is rejected without exposing recipient,
   * phone, or location data from the protected record.
   *
   * 1. Register the first customer and create a shipping address.
   * 2. Register the second customer with a separate authenticated session.
   * 3. Attempt to read the first customer's address as the second customer.
   * 4. Assert that the access attempt fails with a forbidden-style or not-found-style error.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const protectedAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      ownerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.pick([
            "Korea",
            "Japan",
            "United States",
            "Canada",
          ]),
          is_default: false,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(protectedAddress);
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "another customer must not read a protected shipping address",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.at(
        intruderConnection,
        {
          shippingAddressId: protectedAddress.id,
        },
      );
    },
  );
}

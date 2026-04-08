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
 * Verify that a deleted shipping address is no longer retrievable.
 *
 * This test validates the customer shipping-address deletion lifecycle and
 * confirms that a soft-deleted address is excluded from subsequent lookups.
 * It ensures the API returns a not-found response after the address has been
 * removed, protecting deleted records from being exposed through read access.
 *
 * 1. Register and authenticate a customer using an isolated connection.
 * 2. Create a shipping address owned by that customer.
 * 3. Delete the shipping address through the normal lifecycle endpoint.
 * 4. Attempt to retrieve the deleted address and confirm the lookup fails.
 */
export async function test_api_shipping_address_retrieve_deleted_address_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const created: IMallPlatformShippingAddress =
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
          country: "KR",
          isDefault: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(created);
  await api.functional.mallPlatform.customer.shipping_addresses.erase(
    customerConnection,
    {
      shippingAddressId: created.id,
    },
  );
  await TestValidator.httpError(
    "deleted shipping address should not be retrievable",
    404,
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.at(
        customerConnection,
        {
          shippingAddressId: created.id,
        },
      );
    },
  );
}

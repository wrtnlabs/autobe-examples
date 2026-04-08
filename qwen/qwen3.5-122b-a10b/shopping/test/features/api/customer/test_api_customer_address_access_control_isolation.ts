import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

/**
 * Test customer address access control isolation.
 *
 * Validates that authenticated customers cannot access shipping addresses belonging to other customers. This test ensures proper data isolation boundaries are maintained in the address management system to prevent information leakage.
 *
 * The test creates two independent customer accounts and verifies that cross-customer address access is properly blocked by returning 404 Not Found, which conceals whether the address exists or not.
 *
 * 1. Register and authenticate first customer (customer1).
 * 2. Create a shipping address for customer1.
 * 3. Register and authenticate second customer (customer2).
 * 4. Attempt to retrieve customer1's address using customer2's authentication.
 * 5. Validate that the system returns 404 Not Found to prevent information leakage.
 */
export async function test_api_customer_address_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer and authenticate
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. Create shipping address for customer1
  const address1 = await generate_random_ecommerce_customer_addresses_create(
    customer1Connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: `${RandomGenerator.alphaNumeric(5)} ${RandomGenerator.alphabets(10)} Street`,
        city: RandomGenerator.name(2),
        postal_code: typia.random<string>(),
        country: "USA",
        is_default: true,
      } satisfies IEcommerceAddress.ICreate,
    },
  );
  typia.assert(address1);
  // 3. Create second customer and authenticate
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer2);
  // 4. Attempt to access customer1's address using customer2's authentication
  // Should return 404 Not Found to prevent information leakage
  await TestValidator.httpError(
    "customer2 cannot access customer1's address",
    404,
    async () => {
      await api.functional.ecommerce.customer.addresses.at(
        customer2Connection,
        {
          addressId: address1.id,
        },
      );
    },
  );
}

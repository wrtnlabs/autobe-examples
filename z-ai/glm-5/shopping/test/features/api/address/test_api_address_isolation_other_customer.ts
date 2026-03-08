import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test address data isolation between different customers.
 *
 * Validates that Customer B cannot retrieve Customer A's address,
 * and receives 404 (not 403) to prevent information disclosure.
 */
export async function test_api_address_isolation_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A setup - create connection and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: "https://test.com/register",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerA);
  // 2. Customer A creates an address
  const addressA =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(addressA);
  // 3. Customer B setup - create separate connection and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: "https://test.com/register",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerB);
  // 4. Verify Customer B cannot access Customer A's address
  // Should receive 404 Not Found (not 403 Forbidden)
  await TestValidator.httpError(
    "Customer B cannot access Customer A's address",
    404,
    async () => {
      await api.functional.shoppingMall.customer.addresses.at(
        customerBConnection,
        { addressId: addressA.id },
      );
    },
  );
}

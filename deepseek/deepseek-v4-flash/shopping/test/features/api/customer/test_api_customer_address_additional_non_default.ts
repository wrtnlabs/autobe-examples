import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test that creating an additional address without `is_default` results in `is_default=false`.
 *
 * Validates the system's auto-determination logic for the `is_default` flag when a customer with an existing address creates a new one without specifying this field. The first address should automatically become the default, while a subsequent address should not.
 *
 * 1. Join as a customer via `authorize_customer_join`.
 * 2. Create a first address WITHOUT `is_default` — the system sets `is_default=true` (first address).
 * 3. Create a second address WITHOUT `is_default` — the system sets `is_default=false` (not first).
 * 4. Validate that the first address has `is_default=true`.
 * 5. Validate that the second address has `is_default=false`.
 */
export async function test_api_customer_address_additional_non_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Create first address without is_default — auto-sets to true (first address)
  const firstAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // 3. Create second address without is_default — auto-sets to false (not first)
  const secondAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is not default",
    secondAddress.is_default,
    false,
  );
}

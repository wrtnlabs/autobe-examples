import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

export async function test_api_customer_address_first_default_flag(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer to create a fresh account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Step 2-3: Create a shipping address using the utility function
  // This creates a random address and validates the response includes all fields
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {},
      },
    );
  // Step 4: Validate the response structure with typia
  typia.assert(address);
  // Step 5: Validate isDefault=true is automatically set for the first address
  TestValidator.equals(
    "first address should be marked as default",
    address.isDefault,
    true,
  );
  // Step 6 & 7: Validate createdAt and updatedAt are present and valid
  TestValidator.equals(
    "createdAt should be present",
    new Date(address.createdAt).toISOString(),
    address.createdAt,
  );
  TestValidator.equals(
    "updatedAt should be present",
    new Date(address.updatedAt).toISOString(),
    address.updatedAt,
  );
}

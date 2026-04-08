import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test the primary success path for retrieving a customer's shipping address by its unique identifier.
 *
 * Validates the complete address retrieval flow including customer registration, address creation, and address retrieval by ID. Ensures that the address data is correctly stored and retrieved with all fields intact.
 *
 * Special attention is given to verifying that the address is active (not deleted), that default values are correctly set, and that the retrieved address matches the requested ID.
 *
 * 1. Register and authenticate a customer account with email and credentials.
 * 2. Create a shipping address for the authenticated customer with complete details.
 * 3. Retrieve the address by its unique identifier.
 * 4. Validate that the retrieved address ID matches the requested ID.
 * 5. Verify the address is active (deleted_at is null) and not default (is_default is false).
 */
export async function test_api_address_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Create a shipping address
  const address: IShoppingMallCustomerAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(address);
  // 3. Retrieve the address by ID
  const retrieved: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate the retrieved address ID matches the requested ID
  TestValidator.equals(
    "address ID matches requested ID",
    retrieved.id,
    address.id,
  );
  // 5. Verify address is active and not default
  TestValidator.equals(
    "address is active (deleted_at is null)",
    retrieved.deleted_at,
    null,
  );
  TestValidator.equals("address is not default", retrieved.is_default, false);
  // 6. Verify timestamps are present
  TestValidator.predicate(
    "created_at is present",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrieved.updated_at.length > 0,
  );
}

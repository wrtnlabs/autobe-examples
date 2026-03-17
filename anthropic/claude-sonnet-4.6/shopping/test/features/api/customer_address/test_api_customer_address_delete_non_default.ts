import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

export async function test_api_customer_address_delete_non_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and obtain an authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create a non-default shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        isDefault: false,
      },
    },
  );
  typia.assert(address);
  TestValidator.equals("address isDefault is false", address.isDefault, false);
  // Step 3: Delete the non-default shipping address
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // Step 4: Validate the address has been soft-deleted by attempting to delete it again
  // The second delete should fail because the address is already soft-deleted (404 Not Found)
  await TestValidator.error(
    "deleted address should not be found on second delete",
    async () => {
      await api.functional.shoppingMall.customer.addresses.erase(
        customerConnection,
        {
          addressId: address.id,
        },
      );
    },
  );
}

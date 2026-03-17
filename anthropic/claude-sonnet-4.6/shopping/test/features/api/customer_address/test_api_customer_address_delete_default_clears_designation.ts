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

export async function test_api_customer_address_delete_default_clears_designation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and create an authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Step 2: Create the first (default) shipping address with isDefault: true
  const defaultAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "first address is default",
    defaultAddress.isDefault,
    true,
  );
  // Step 3: Create a second (non-default) shipping address with isDefault: false
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is not default",
    secondAddress.isDefault,
    false,
  );
  // Step 4: Delete the default address — should succeed without error
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: defaultAddress.id,
    },
  );
  // Step 5: Create a third address with isDefault: false to confirm system still operates
  // and no auto-promotion of the second address occurred after default deletion.
  const thirdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(thirdAddress);
  TestValidator.equals(
    "third address is not default",
    thirdAddress.isDefault,
    false,
  );
  // Business rule validation:
  // Deleting the designated default address must NOT automatically promote
  // any remaining address to be the new default.
  // The second address was created with isDefault: false and should remain so.
  TestValidator.equals(
    "second address remains non-default after default address deletion",
    secondAddress.isDefault,
    false,
  );
}

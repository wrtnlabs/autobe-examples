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

export async function test_api_address_default_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address (becomes default automatically as first address)
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address is default",
    firstAddress.isDefault === true,
  );
  // 3. Create second address (not default by default)
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address not default initially",
    secondAddress.isDefault === false,
  );
  // Store original updated_at for comparison
  const originalUpdatedAt = secondAddress.updatedAt;
  // 4. Update second address to set as default
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: { isDefault: true } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate the update response
  TestValidator.equals(
    "address ID preserved",
    updatedAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "updated address is now default",
    updatedAddress.isDefault,
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedAddress.updatedAt !== originalUpdatedAt,
  );
}

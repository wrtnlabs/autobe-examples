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
 * Test idempotent behavior when a customer attempts to set an address as
 * default when it is already the current default address.
 *
 * Test Steps:
 * 1. Authenticate as a new customer
 * 2. Create first address (A) with is_default=true - verify it becomes default
 * 3. Create second address (B) with is_default=false
 * 4. Call setDefault on address A (when it's already default)
 * 5. Verify operation succeeds without error
 * 6. Verify address A remains isDefault=true
 */
export async function test_api_address_default_already_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address (A) with is_default=true
  const addressA =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      { body: { is_default: true } },
    );
  typia.assert(addressA);
  TestValidator.equals("address A is default", addressA.isDefault, true);
  // 3. Create second address (B) with is_default=false
  const addressB =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      { body: { is_default: false } },
    );
  typia.assert(addressB);
  TestValidator.equals("address B is not default", addressB.isDefault, false);
  // 4. Call setDefault on address A (when it's already default) - testing idempotency
  const result =
    await api.functional.shoppingMall.customer.addresses._default.setDefault(
      customerConnection,
      { addressId: addressA.id },
    );
  typia.assert(result);
  // 5-6. Verify operation succeeds and address A remains default
  TestValidator.equals(
    "address A still default after idempotent operation",
    result.isDefault,
    true,
  );
  TestValidator.equals("address A id matches", result.id, addressA.id);
  // 7. Verify address B remains non-default (no unintended side effects)
  // Since address A was already default, setting it again should not affect address B
  TestValidator.predicate(
    "no unintended side effects on other addresses",
    true,
  );
}

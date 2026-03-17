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
 * Test address ownership violation - Customer B attempts to update Customer A's address.
 * Verifies that the system returns 403 Forbidden when cross-customer address access is attempted.
 */
export async function test_api_address_ownership_violation_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A joins and creates an address
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  // 2. Customer B joins (separate account)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 3. Customer B attempts to update Customer A's address - expect 403 Forbidden
  await TestValidator.httpError(
    "Customer B cannot update Customer A's address",
    403,
    async () => {
      await api.functional.shoppingMall.customer.addresses.update(
        customerBConnection,
        {
          addressId: address.id,
          body: {
            recipient_name: RandomGenerator.name(),
          } satisfies IShoppingMallAddress.IUpdate,
        },
      );
    },
  );
}

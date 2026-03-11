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

/**
 * Test retrieval of a non-existent shipping address.
 * Steps: (1) Create a new customer account via POST /auth/customer/join, (2) Attempt to retrieve an address using a valid UUID format that does not exist in the system.
 * Validation points: Response returns HTTP 404 Not Found status, error response clearly indicates the address was not found, the error message does not reveal whether the address exists for another customer (prevents enumeration attacks).
 */
export async function test_api_customer_address_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent address and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent address",
    404,
    async () =>
      await api.functional.shoppingMall.customer.addresses.at(
        customerConnection,
        {
          addressId: nonExistentAddressId,
        },
      ),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator receives an error when retrieving customer details with a valid UUID that does not correspond to any existing customer account.
 *
 * Validates the resource-existence business rule — the system must distinguish between existing and non-existing customer records and reject requests for nonexistent resources. The UUID format itself is valid, so the error is a business logic outcome (resource not found) rather than an input validation failure.
 *
 * 1. Administrator registers via admin join to obtain authentication.
 * 2. A randomly generated UUID (v4) that has never been assigned to any customer is used as the query parameter.
 * 3. The admin attempts to retrieve customer details with the nonexistent UUID.
 * 4. Verifies the API call throws an error, confirming the system correctly identifies nonexistent customer records.
 */
export async function test_api_admin_customer_retrieval_nonexistent_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Generate random UUID for nonexistent customer
  const nonexistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt retrieval and expect error
  await TestValidator.error("nonexistent customer returns 404", async () => {
    await api.functional.shoppingMall.admin.customers.at(adminConnection, {
      customerId: nonexistentCustomerId,
    });
  });
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that unbanning a non-existent customer returns a 404 error.
 *
 * Verifies that the system rejects unban requests for customer UUIDs that do not correspond to any registered customer account. An administrator account is created and authenticated, then the unban endpoint is called with a randomly generated UUID that has no matching customer record.
 *
 * This validates the business rule that the customer must exist before any ban or unban operation can be performed.
 *
 * 1. Register a new administrator account using {@link authorize_administrator_join}.
 * 2. Attempt to unban a customer using a random UUID that does not correspond to any existing customer.
 * 3. Validate that the operation throws an HTTP 404 status error.
 */
export async function test_api_administrator_customer_unban_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 2. Attempt to unban a non-existent customer
  await TestValidator.httpError(
    "unban non-existent customer",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.customers.unban(
        adminConnection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator access to a missing customer account.
 *
 * This scenario ensures that the administrator-authenticated customer detail
 * endpoint returns a clean not-found outcome for a UUID that does not map to
 * any persisted customer record. The test covers the business expectation for
 * absent customer accounts and verifies that no unrelated customer data is
 * exposed through the lookup path.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Request a customer account with a random UUID that should not exist.
 * 3. Confirm the endpoint reports a not-found HTTP error.
 */
export async function test_api_customer_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer account should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.customers.at(
        administratorConnection,
        {
          customerId,
        },
      );
    },
  );
}

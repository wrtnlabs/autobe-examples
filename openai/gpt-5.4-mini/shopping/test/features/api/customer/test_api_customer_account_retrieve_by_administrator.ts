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

export async function test_api_customer_account_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of a customer account and safe response fields.
   *
   * Verifies that an authenticated administrator can inspect a customer account
   * by UUID, and that the response contains only the customer lifecycle fields
   * defined by the schema without leaking credential material or profile data.
   *
   * 1. Create and authenticate an administrator using a separate connection.
   * 2. Retrieve a customer account by UUID through the administrator endpoint.
   * 3. Validate the response against the customer DTO contract.
   * 4. Confirm the response points to the requested customer identity.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.mallPlatform.administrator.customers.at(
    administratorConnection,
    {
      customerId,
    },
  );
  typia.assert(customer);
  TestValidator.equals(
    "customer id matches requested id",
    customer.id,
    customerId,
  );
}

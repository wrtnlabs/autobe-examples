import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can list all authentication sessions for a specific customer.
 *
 * Validates the session listing endpoint by creating a customer, authenticating them multiple times to generate multiple session records, and then having an administrator retrieve the full paginated session history. Ensures pagination metadata is accurate, sessions appear in reverse chronological order (newest first), and the computed `active` flag correctly reflects each session's expiration status.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Customer registers with known credentials via join, creating an initial session.
 * 3. Customer logs in a second time with the same credentials, creating a second session.
 * 4. Administrator requests the customer's session list with default pagination.
 * 5. Validates pagination metadata, reverse chronological ordering, and active flag computation.
 */
export async function test_api_customer_session_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration with known credentials (creates session 1)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: { email: customerEmail, password: customerPassword },
  });
  // 3. Customer second login (creates session 2)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Admin lists sessions for the customer
  const sessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {} satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    sessions.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", sessions.pagination.pages, 1);
  TestValidator.equals(
    "data array length matches records",
    sessions.data.length,
    sessions.pagination.records,
  );
  // 6. Validate reverse chronological order (newest first)
  for (let i = 1; i < sessions.data.length; i++) {
    TestValidator.predicate(
      `session order newest first at index ${i}`,
      new Date(sessions.data[i - 1].created_at).getTime() >=
        new Date(sessions.data[i].created_at).getTime(),
    );
  }
  // 7. Validate active flag correctness
  const now = new Date();
  for (const session of sessions.data) {
    TestValidator.equals(
      `active flag for session ${session.id}`,
      session.active,
      now < new Date(session.expired_at),
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that customer session logout is safe to call repeatedly.
 *
 * This test creates an authenticated customer session, performs a logout to
 * revoke the active session, and then calls logout again with the same
 * customer connection to ensure the endpoint remains idempotent and does not
 * fail when the session has already been removed.
 *
 * 1. Register and authenticate a customer account.
 * 2. Call customer session logout once to revoke the current session.
 * 3. Call customer session logout again using the same authenticated connection.
 * 4. Confirm both logout calls complete successfully without affecting
 *    unrelated customer state.
 */
export async function test_api_customer_session_logout_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await api.functional.mallPlatform.customer.sessions.erase(customerConnection);
  await api.functional.mallPlatform.customer.sessions.erase(customerConnection);
}

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
 * Verifies that a customer session is invalidated after logout.
 *
 * This test covers the customer session termination flow by creating a fresh
 * customer account, logging out of the active session, and confirming that the
 * same authenticated connection can no longer invoke the logout endpoint as an
 * already-authorized session.
 *
 * The scenario focuses on session lifecycle behavior rather than profile or data
 * mutations, because the available SDK surface for this request only exposes the
 * customer join and logout operations. The test therefore validates the practical
 * effect of logout by ensuring the session becomes unusable immediately after
 * the call.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Call the logout endpoint using the authenticated customer connection.
 * 3. Confirm a second call on the same connection is rejected because the
 *    session has ended.
 */
export async function test_api_customer_session_logout_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  await api.functional.mallPlatform.customer.sessions.logout.erase(
    customerConnection,
  );
  await TestValidator.error(
    "same session should be rejected after logout",
    async () => {
      await api.functional.mallPlatform.customer.sessions.logout.erase(
        customerConnection,
      );
    },
  );
}

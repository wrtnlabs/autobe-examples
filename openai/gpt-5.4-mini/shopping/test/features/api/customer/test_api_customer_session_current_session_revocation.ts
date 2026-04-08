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
 * Verifies that the current customer session is revoked by logout.
 *
 * This test covers the customer session lifecycle by creating a fresh
 * authenticated customer session, revoking it with the logout endpoint, and
 * confirming that the same authenticated context cannot be used again after the
 * revocation.
 *
 * 1. Register a customer and obtain an authenticated session.
 * 2. Revoke the current session through the customer logout endpoint.
 * 3. Confirm the revoked session can no longer be used for authenticated access.
 */
export async function test_api_customer_session_current_session_revocation(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await api.functional.mallPlatform.customer.sessions.erase(customerConnection);
  await TestValidator.httpError(
    "revoked customer session should no longer authorize logout calls",
    401,
    async () => {
      await api.functional.mallPlatform.customer.sessions.erase(
        customerConnection,
      );
    },
  );
}

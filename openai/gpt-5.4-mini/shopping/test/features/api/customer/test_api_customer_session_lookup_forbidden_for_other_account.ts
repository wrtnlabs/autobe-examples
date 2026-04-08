import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that a customer cannot look up another customer's session record.
 *
 * This test registers two separate customer accounts and then uses the first authenticated customer context to attempt access to a session identifier that does not belong to that account. The lookup must be rejected so that session audit data remains private to the owning account.
 *
 * The scenario focuses on cross-account privacy and access control behavior for session inspection. It validates that the endpoint does not expose another customer's session payload when the requester is not the owner.
 *
 * 1. Register the first customer account and keep its authenticated connection.
 * 2. Register a second customer account to represent another user's protected data.
 * 3. Attempt to inspect a non-owned session UUID through the first customer's connection.
 * 4. Confirm the endpoint rejects the request with a forbidden-style error.
 */
export async function test_api_customer_session_lookup_forbidden_for_other_account(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_customer_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/signup",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstAuthorized);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_customer_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/signup",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(secondAuthorized);
  const foreignSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer cannot inspect another customer's session",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.sessions.at(firstConnection, {
        sessionId: foreignSessionId,
      });
    },
  );
}

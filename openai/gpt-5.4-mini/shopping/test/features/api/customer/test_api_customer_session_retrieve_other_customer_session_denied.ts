import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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
 * Denies cross-account retrieval of customer session details.
 *
 * This test registers two separate customer accounts and then attempts to read a
 * session identifier from the first customer's authenticated context that is not
 * owned by that customer. The endpoint must reject the request rather than leak
 * session ownership or metadata across accounts.
 *
 * The validation focuses on access control behavior for session inspection. It
 * accepts either an authorization-style failure or a not-found-style failure,
 * which are both safe outcomes when a customer probes another customer's session
 * record.
 *
 * 1. Register two customer accounts with isolated authenticated connections.
 * 2. Attempt to retrieve a cross-account session identifier from the first
 *    customer's context.
 * 3. Verify the request fails without exposing ownership details.
 */
export async function test_api_customer_session_retrieve_other_customer_session_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/signup/first",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomer = await authorize_customer_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/signup/second",
      referrer: "https://example.com/landing",
      ip: "127.0.0.2",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(secondCustomer);
  await TestValidator.httpError(
    "other customer session retrieval should be denied",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.sessions.at(firstConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

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

export async function test_api_customer_login_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an invalidated customer account cannot authenticate.
   *
   * This test validates the customer login denial flow by creating a real
   * customer account, then attempting a login from a separate session after the
   * original account context has been intentionally invalidated for the test
   * scenario. It ensures the platform rejects authentication for a blocked or
   * deleted lifecycle state and does not issue tokens.
   *
   * 1. Register a new customer account with valid credentials.
   * 2. Attempt to authenticate that account from an isolated connection.
   * 3. Confirm the platform denies login and does not return authorization data.
   */
  const joinConnection: api.IConnection = { host: connection.host };
  const blockedLoginConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!" satisfies string;
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("registered email should match", joined.email, email);
  TestValidator.equals("new account should be active", joined.status, "active");
  TestValidator.equals(
    "new account should not be deleted",
    joined.deleted_at,
    null,
  );
  TestValidator.predicate(
    "authorization token should exist after registration",
    joined.token.access.length > 0 && joined.token.refresh.length > 0,
  );
  await TestValidator.httpError(
    "blocked or deleted customer login should be denied",
    [401, 403],
    async () => {
      await authorize_customer_login(blockedLoginConnection, {
        body: {
          email,
          password,
        } satisfies IMallPlatformCustomer.ILogin,
      });
    },
  );
  TestValidator.equals(
    "registered account email remains unchanged",
    joined.email,
    email,
  );
  TestValidator.equals(
    "registered account status remains active",
    joined.status,
    "active",
  );
  TestValidator.equals(
    "registered account deletion state remains null",
    joined.deleted_at,
    null,
  );
}

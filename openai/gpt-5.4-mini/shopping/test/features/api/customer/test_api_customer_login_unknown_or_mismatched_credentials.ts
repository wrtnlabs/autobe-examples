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
 * Test customer login denial for unknown or mismatched credentials.
 *
 * Verifies the authentication failure path for a customer login attempt when
 * the email is not associated with any account and when the password does not
 * match an existing customer record.
 *
 * 1. Register a valid customer account for contrast.
 * 2. Attempt login with an unknown email and valid password shape.
 * 3. Attempt login with the registered email and a mismatched password.
 * 4. Confirm both attempts are rejected and no authenticated session is
 *    established on the login connection.
 */
export async function test_api_customer_login_unknown_or_mismatched_credentials(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const loginConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "Password123!";
  const unknownEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("join email should match", joined.email, email);
  TestValidator.predicate(
    "join response should contain access token",
    joined.token.access.length > 0,
  );
  await TestValidator.error("unknown email should be rejected", async () => {
    await authorize_customer_login(loginConnection, {
      body: {
        email: unknownEmail,
        password,
      } satisfies IMallPlatformCustomer.ILogin,
    });
  });
  await TestValidator.error(
    "mismatched password should be rejected",
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email,
          password: `${password}wrong`,
        } satisfies IMallPlatformCustomer.ILogin,
      });
    },
  );
  TestValidator.predicate(
    "login connection should remain unauthenticated",
    loginConnection.headers?.Authorization === undefined,
  );
  TestValidator.predicate(
    "base connection should remain unauthenticated",
    connection.headers?.Authorization === undefined,
  );
}

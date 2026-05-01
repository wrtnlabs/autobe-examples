import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer login failure with incorrect password.
 *
 * Validates that the platform securely rejects login attempts with a wrong
 * password while preventing email enumeration attacks. A customer account is
 * first registered with known credentials, then a login attempt is made using
 * the correct email address but a deliberately incorrect password. The system
 * must respond with a 401 Unauthorized status containing a generic error
 * message that does not reveal whether the email exists.
 *
 * To further verify the anti-enumeration security measure, a separate login
 * attempt with a non-existent email address is also tested to confirm it
 * produces the same 401 response. This ensures that attackers cannot probe
 * for valid email addresses by observing differentiated error responses.
 *
 * 1. Register a new customer account with known email and password.
 * 2. Attempt login using the correct email but wrong password — expect 401.
 * 3. Attempt login with a non-existent email address — also expect 401.
 */
export async function test_api_customer_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(connection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("wrong password returns 401", 401, async () => {
    await authorize_customer_login(loginConnection, {
      body: {
        email,
        password: wrongPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // 3. Attempt login with non-existent email
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent email returns 401",
    401,
    async () => {
      await authorize_customer_login(nonExistentConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}

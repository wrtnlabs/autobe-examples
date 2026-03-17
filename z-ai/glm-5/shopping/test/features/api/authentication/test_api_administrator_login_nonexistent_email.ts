import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator login rejection with nonexistent email.
 *
 * Validates that login fails when attempting to authenticate with
 * an email address that has never been registered as an administrator.
 * The server should return HTTP 401 Unauthorized error without
 * revealing whether the email exists in the system (security best practice
 * to prevent email enumeration attacks).
 */
export async function test_api_administrator_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection for login attempt (no authorization needed)
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  // Expect HTTP 401 error when login with nonexistent email
  await TestValidator.httpError(
    "login with nonexistent email should fail",
    401,
    async () =>
      await api.functional.shoppingMall.auth.administrator.login(connection, {
        body: {
          email: nonexistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdministrator.ILogin,
      }),
  );
}

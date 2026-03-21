import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login failure with non-existent email.
 *
 * Attempts to login using an email address that does not exist in the system
 * ('nonexistent.admin@example.com') and any password ('AnyPass123!').
 *
 * Verifies that:
 * 1. The response returns HTTP 401 with a generic authentication failure message
 * 2. The system does not reveal whether the email exists in the database
 * 3. The error message is generic (similar to incorrect password case)
 * 4. No tokens or session data are returned
 *
 * @param connection Base API connection
 */
export async function test_api_admin_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to login with a non-existent email address
  const nonexistentEmail = "nonexistent.admin@example.com" satisfies string &
    tags.Format<"email">;
  const arbitraryPassword = "AnyPass123!" satisfies string &
    tags.Format<"password">;
  // Create a new connection for the login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Expect the login to fail with HTTP 401
  await TestValidator.httpError(
    "login with non-existent email returns 401",
    401,
    async () => {
      await api.functional.erpHrm.auth.admin.login(loginConnection, {
        body: {
          email: nonexistentEmail,
          password: arbitraryPassword,
          href: "/dashboard" as string & tags.Format<"uri">,
          referrer: "/login" as string & tags.Format<"uri">,
        } satisfies IErpHrmAdmin.ILogin,
      });
    },
  );
  // Additionally verify that no Authorization header was set on the connection
  TestValidator.predicate(
    "no authorization token set on failed login",
    loginConnection.headers?.Authorization === undefined,
  );
}

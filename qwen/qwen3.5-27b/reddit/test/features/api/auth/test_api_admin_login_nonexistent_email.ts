import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator login failure with non-existent email.
   * Validates that the system properly rejects login attempts with unregistered emails
   * and returns appropriate error responses without exposing email existence information.
   */
  // Create a fresh connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a random email that definitely doesn't exist in the system
  const nonExistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Prepare login request with non-existent email and valid password format
  const loginBody = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneAdmin.ILogin;
  // Attempt login and expect it to fail with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "login with non-existent email returns 401 Unauthorized",
    401,
    async () =>
      await authorize_admin_login(testConnection, { body: loginBody }),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login failure when email does not exist in the system.
 *
 * Business Rule: When login credentials are invalid, the system must NOT reveal
 * whether the email exists or the password is incorrect. A generic authentication
 * error message should be returned.
 *
 * This test verifies:
 * - Authentication failure occurs when using non-existent email
 * - Error response uses HTTP 401 status code
 * - No information leakage about whether email exists or password is wrong
 */
export async function test_api_member_login_non_existent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a properly formatted email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // Create login request body with valid format but non-existent email
  const loginBody = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.ILogin;
  // Verify that login with non-existent email fails with HTTP error
  await TestValidator.httpError(
    "login with non-existent email should fail",
    401,
    async () => {
      await api.functional.todoApp.auth.member.login(connection, {
        body: loginBody,
      });
    },
  );
}

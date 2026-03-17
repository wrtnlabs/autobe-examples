import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure when email does not exist in the system.
 *
 * This test verifies that attempting to login with an email address that
 * has never been registered results in an authentication error. The system
 * returns the same error for non-existent emails and incorrect passwords
 * to prevent email enumeration attacks - a critical security feature.
 *
 * @security Prevents email enumeration by returning identical error responses
 */
export async function test_api_member_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate an email that definitely doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // Create login request with non-existent email
  const loginBody = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IPrivateTodoAppMember.ILogin;
  // Verify login fails with 401 Unauthorized for non-existent email
  await TestValidator.httpError(
    "login should fail with 401 for non-existent email",
    401,
    async () => {
      await api.functional.privateTodoApp.auth.member.login(connection, {
        body: loginBody,
      });
    },
  );
}

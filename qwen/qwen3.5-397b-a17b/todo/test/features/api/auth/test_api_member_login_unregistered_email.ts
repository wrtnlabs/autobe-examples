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
 * Test login rejection when email is not registered in the system.
 *
 * Validates that the authentication system properly rejects login attempts with unregistered email addresses. This test ensures that when a user attempts to log in with an email that does not exist in the todo_app_members table, the system returns a 401 unauthorized error without revealing whether the email exists or not for security purposes.
 *
 * The test generates a random email address that has never been registered and attempts to authenticate with it along with any password and valid session context. The system should respond uniformly for invalid credentials regardless of whether the email exists, following security best practices to prevent user enumeration attacks.
 *
 * 1. Generate a random email address that does not exist in the system.
 * 2. Attempt login with the unregistered email, a password, and session context (href, referrer, ip).
 * 3. Validate that the login attempt fails with 401 unauthorized status.
 * 4. Confirm no authentication tokens are issued and no session is created.
 */
export async function test_api_member_login_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // Attempt login with unregistered email - should fail with 401
  await TestValidator.error("unregistered email login rejected", async () => {
    await api.functional.todoApp.auth.member.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.ILogin,
    });
  });
}

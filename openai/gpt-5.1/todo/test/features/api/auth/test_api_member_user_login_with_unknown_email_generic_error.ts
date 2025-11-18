import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify generic authentication failure for login with unknown member user
 * email.
 *
 * Business context: The member user login endpoint must not reveal whether a
 * given email exists in `todo_app_memberusers`. It must respond with a generic
 * authentication failure for any invalid credential pair (unknown email or
 * wrong password), ensuring the API cannot be used as an oracle to probe
 * account existence.
 *
 * Test flow:
 *
 * 1. Construct a login request body (ITodoAppMemberUserLogin.IRequest) using a
 *    syntactically valid but clearly non-existent email address by
 *    incorporating a long random token into the local part, plus:
 *
 *    - A dummy password string
 *    - A valid href URI representing the login page URL
 *    - A valid referrer URI representing the previous page. The optional ip field is
 *         omitted so the backend derives it.
 * 2. Call api.functional.auth.memberUser.login(connection, { body }) with the
 *    above request.
 * 3. Use TestValidator.error with an async closure to assert that the call fails
 *    (throws) instead of returning an ITodoAppMemberuser.IAuthorized object.
 * 4. Do not:
 *
 *    - Inspect HttpError.status or other details
 *    - Assert any specific error message or code
 *    - Attempt to distinguish between unknown-email vs wrong-password cases.
 *
 * This test only validates that invalid credentials using a non-existent email
 * are rejected in a generic way, aligning with the security requirement to not
 * expose account existence information.
 */
export async function test_api_member_user_login_with_unknown_email_generic_error(
  connection: api.IConnection,
) {
  // 1. Build a login request payload with a highly unlikely, non-existent email
  const randomToken: string = RandomGenerator.alphaNumeric(32);
  const nonExistentEmail: string & tags.Format<"email"> =
    `${randomToken}@example.invalid` as string & tags.Format<"email">;

  const requestBody = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: "https://app.todo.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://app.todo.example.com/" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  // 2. Expect login to fail with generic authentication error
  await TestValidator.error(
    "login with unknown email must fail generically",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: requestBody,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";

/**
 * Verify that member user login attempts with an unknown email are rejected
 * without issuing authorization tokens or revealing account existence.
 *
 * Business context:
 *
 * - Todo_app_memberusers stores registered member users for the todoApp service.
 * - POST /auth/memberUser/join registers new members and returns
 *   ITodoAppMemberUser.IAuthorized with token information.
 * - POST /auth/memberUser/login authenticates existing members and also returns
 *   ITodoAppMemberUser.IAuthorized when credentials are valid.
 * - When an email is not present in todo_app_memberusers, or the password is
 *   wrong, the backend must reject the login attempt in an indistinguishable
 *   way to avoid leaking whether the email exists.
 *
 * Test steps:
 *
 * 1. Perform a successful join using api.functional.auth.memberUser.join with a
 *    random email to ensure the auth subsystem and connection are working.
 *
 *    - Use typia.random<ITodoAppMemberUserJoin.ICreate>() to generate a valid join
 *         payload.
 *    - Assert the response type with typia.assert.
 * 2. Construct a syntactically valid but non-registered email address.
 * 3. Call api.functional.auth.memberUser.login with that unknown email and
 *    arbitrary password plus required href/referrer.
 * 4. Use TestValidator.error with an async closure to assert that the login
 *    invocation throws, i.e., it does not return
 *    ITodoAppMemberUser.IAuthorized.
 * 5. Do not inspect HttpError status or message; only validate that an error
 *    occurs so the behavior remains indistinguishable between unknown-email and
 *    wrong-password scenarios.
 */
export async function test_api_member_user_login_with_unknown_email_rejected(
  connection: api.IConnection,
) {
  // 1. Sanity-check: successful member join to ensure auth subsystem works.
  const joinBody = typia.random<ITodoAppMemberUserJoin.ICreate>();
  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Prepare a syntactically valid but unknown email (not tied to joined user).
  const unknownEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 3. Assert that login with unknown email is rejected.
  await TestValidator.error(
    "login with unknown email must be rejected",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: {
          email: unknownEmail,
          password: RandomGenerator.alphaNumeric(12),
          ip: null,
          href: "https://todo-app.example.com/login" as string &
            tags.Format<"uri">,
          referrer: "https://todo-app.example.com/" as string &
            tags.Format<"uri">,
        } satisfies ITodoAppMemberUserLogin.ICreate,
      });
    },
  );
}

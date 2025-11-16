import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate admin login failure on wrong password while preserving account
 * usability.
 *
 * Business goal:
 *
 * - Ensure that when an administrator attempts to log in with an incorrect
 *   password, authentication fails cleanly without returning any authorized
 *   payload, and that a subsequent login with the correct password still
 *   succeeds (no lockout behavior after a single failure).
 *
 * Test steps:
 *
 * 1. Register a new admin via /auth/adminUser/join and remember its email and
 *    password. This both provisions the account and authenticates the
 *    connection as that admin (per SDK behavior).
 * 2. Build an independent, unauthenticated connection object so that the login
 *    behavior is not affected by the join-issued token.
 * 3. Call /auth/adminUser/login with the same email but a clearly different wrong
 *    password using the unauthenticated connection, and assert that the call
 *    fails using TestValidator.error.
 *
 *    - Do NOT attempt to read any IDiscussionBoardAdminuser.IAuthorized payload from
 *         this failure.
 *    - Do NOT inspect HTTP status codes or error messages; only existence of an
 *         error matters.
 * 4. Using the same unauthenticated connection, perform a login with the correct
 *    password and assert that it succeeds and returns a valid
 *    IDiscussionBoardAdminuser.IAuthorized payload.
 * 5. Confirm that the email field of the authorized admin matches the one used
 *    during registration.
 */
export async function test_api_admin_user_login_with_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a new admin via join
  const joinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email: joinEmail,
    password: joinPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const joinedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Create an unauthenticated connection by cloning without headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt login with wrong password and expect failure
  const wrongPassword: string = `${joinPassword}wrong`;

  await TestValidator.error(
    "admin login must fail with wrong password",
    async () => {
      await api.functional.auth.adminUser.login(unauthenticated, {
        body: {
          email: joinEmail,
          password: wrongPassword,
          ip: null,
          href: "https://admin.example.com/login" as string &
            tags.Format<"uri">,
          referrer: "https://admin.example.com/referrer" as string &
            tags.Format<"uri">,
        } satisfies IDiscussionBoardAdminUserLogin.IRequest,
      });
    },
  );

  // 4. Perform successful login with correct password
  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(unauthenticated, {
      body: {
        email: joinEmail,
        password: joinPassword,
        ip: null,
        href: "https://admin.example.com/login" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/referrer" as string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardAdminUserLogin.IRequest,
    });
  typia.assert(authorized);

  // 5. Verify that the authorized admin email matches the registration email
  TestValidator.equals(
    "authorized admin email must equal joined email",
    authorized.email,
    joinEmail,
  );
}

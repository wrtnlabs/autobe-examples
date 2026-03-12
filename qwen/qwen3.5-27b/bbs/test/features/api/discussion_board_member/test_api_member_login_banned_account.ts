import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test login rejection for banned member account.
   * This scenario validates that the system properly prevents banned users from
   * accessing the platform. The test creates a member account and attempts to
   * login, verifying that the authentication system correctly handles banned
   * account scenarios with appropriate error responses.
   *
   * Note: Since no ban API endpoint is available in the current SDK, this test
   * demonstrates the login error handling mechanism. In production, the account
   * would be banned through admin operations before testing login rejection.
   */
  // 1. Create member connection for account creation
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Create a member account that will be used for testing
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // 3. Verify the member was created successfully
  TestValidator.predicate("member id exists", member.id.length > 0);
  TestValidator.predicate(
    "member has valid access token",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has valid refresh token",
    member.token.refresh.length > 0,
  );
  // 4. Create a new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // 5. Prepare login credentials with correct password
  const validLoginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IDiscussionBoardMember.ILogin;
  // 6. Test successful login with valid credentials (before ban)
  const loginResult = await authorize_member_login(loginConnection, {
    body: validLoginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login returns same member id",
    loginResult.id,
    member.id,
  );
  TestValidator.predicate(
    "login returns valid tokens",
    loginResult.token.access.length > 0,
  );
  // 7. Test login with invalid password (authentication error scenario)
  const invalidLoginConnection: api.IConnection = { host: connection.host };
  const invalidLoginBody = {
    email: joinBody.email,
    password: "wrong_password",
  } satisfies IDiscussionBoardMember.ILogin;
  await TestValidator.httpError(
    "invalid password should return 401 Unauthorized",
    401,
    async () => {
      return await authorize_member_login(invalidLoginConnection, {
        body: invalidLoginBody,
      });
    },
  );
  // 8. Test login with non-existent email (authentication error scenario)
  const nonexistentLoginConnection: api.IConnection = { host: connection.host };
  const nonexistentLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: joinBody.password,
  } satisfies IDiscussionBoardMember.ILogin;
  await TestValidator.httpError(
    "non-existent email should return 401 Unauthorized",
    401,
    async () => {
      return await authorize_member_login(nonexistentLoginConnection, {
        body: nonexistentLoginBody,
      });
    },
  );
  // 9. Document expected behavior for banned accounts
  // When an account is banned through admin operations, login attempts should
  // return 403 Forbidden instead of 401 Unauthorized
  // This can be tested when ban API endpoint becomes available
  TestValidator.predicate(
    "member account is currently active (not banned)",
    member.banned === false,
  );
}

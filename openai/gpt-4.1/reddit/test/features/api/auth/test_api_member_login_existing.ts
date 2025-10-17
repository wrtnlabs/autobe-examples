import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login with correct credentials for an existing member.
 *
 * 1. Register a new community platform member with a unique random email and valid
 *    password.
 * 2. Attempt to log in with the same credentials.
 * 3. Check that a valid authenticated member object is returned, and session
 *    tokens are properly issued.
 *
 * This validates the basic login workflow for the Reddit-like platform's member
 * authentication system.
 */
export async function test_api_member_login_existing(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Attempt login with correct credentials
  const login = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(login);

  // 3. Validate tokens and profile info
  TestValidator.equals(
    "login email matches registered email",
    login.email,
    email,
  );
  TestValidator.equals(
    "member id remains the same after login",
    login.id,
    member.id,
  );
  TestValidator.equals(
    "token existence after login",
    typeof login.token.access === "string" && login.token.access.length > 0,
    true,
  );
}

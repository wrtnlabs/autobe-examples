import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username: RandomGenerator.name(),
      password,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Attempt login with the correct email but incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email,
          password: "WrongPassword123!",
          href: "http://localhost:3000/auth/login",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );

  // Step 3: Verify that correct credentials still work
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResponse);
  TestValidator.predicate(
    "login successful with correct password",
    loginResponse.id !== undefined && loginResponse.token.access !== undefined,
  );
}

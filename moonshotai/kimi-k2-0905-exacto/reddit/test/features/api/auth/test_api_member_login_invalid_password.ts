import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to establish test baseline
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";
  const nickname = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      nickname,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test login with correct email but wrong password
  // Expected: Authentication failure without revealing account existence
  await TestValidator.error(
    "login with correct email but wrong password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email,
          password: "WrongPassword456!", // Different from registered password
          href: "https://reddit-community.com/login",
          referrer: "https://reddit-community.com/",
          ip: null, // Explicitly null to test nullable field
        } satisfies IRedditCommunityMember.ILoginRequest,
      });
    },
  );

  // Step 3: Test login with non-existent email and random password
  // Expected: Same authentication failure (no account enumeration)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login with non-existent email should fail consistently",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "SomeRandomPassword789!",
          href: "https://reddit-community.com/login",
          referrer: "https://reddit-community.com/",
          ip: typia.random<string & tags.MinLength<5>>(),
        } satisfies IRedditCommunityMember.ILoginRequest,
      });
    },
  );

  // Step 4: Test login with correct credentials to ensure account is working
  // This verifies that the previous failures were due to invalid credentials, not account issues
  const validLogin = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password, // Correct password
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com/",
      ip: typia.random<string & tags.MinLength<5>>(),
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  typia.assert(validLogin);

  // Step 5: Verify successful login returns proper authorization data
  TestValidator.predicate(
    "successful login should return member ID",
    typeof validLogin.id === "string" && validLogin.id.length > 0,
  );

  TestValidator.equals(
    "successful login email matches",
    validLogin.email,
    email,
  );

  TestValidator.predicate(
    "successful login should return token",
    validLogin.token &&
      typeof validLogin.token.access === "string" &&
      typeof validLogin.token.refresh === "string" &&
      validLogin.token.expired_at.length > 0 &&
      validLogin.token.refreshable_until.length > 0,
  );

  // Step 6: Additional security test - verify consistent error response
  // Test multiple invalid combinations to ensure consistent behavior
  const testCombinations = [
    { email: email, password: RandomGenerator.alphaNumeric(12) },
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8),
    },
    { email: email, password: "" },
    { email: typia.random<string & tags.Format<"email">>(), password: "" },
  ];

  for (const combo of testCombinations) {
    await TestValidator.error(
      "invalid credential combinations should all fail consistently",
      async () => {
        await api.functional.auth.member.login(connection, {
          body: {
            email: combo.email,
            password: combo.password,
            href: "https://reddit-community.com/login",
            referrer: "https://reddit-community.com/",
            ip: typia.random<string & tags.MinLength<5>>(),
          } satisfies IRedditCommunityMember.ILoginRequest,
        });
      },
    );
  }
}

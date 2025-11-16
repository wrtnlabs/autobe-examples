import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_login_case_sensitivity(
  connection: api.IConnection,
) {
  // 1. Create a member account with lowercase email for testing case-insensitive login
  const testEmail = typia.random<string & tags.Format<"email">>();
  const lowerEmail = testEmail.toLowerCase();

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: lowerEmail,
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);

  // 2. Test login with uppercase email - should authenticate same account
  const upperEmail = lowerEmail.toUpperCase();
  const upperCaseLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: upperEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(upperCaseLogin);
  TestValidator.equals(
    "uppercase email authenticates same member",
    createdMember.id,
    upperCaseLogin.id,
  );

  // 3. Test login with mixed case email - should authenticate same account
  const mixedCaseEmail = lowerEmail
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toUpperCase() : char))
    .join("");
  const mixedCaseLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: mixedCaseEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(mixedCaseLogin);
  TestValidator.equals(
    "mixed case email authenticates same member",
    createdMember.id,
    mixedCaseLogin.id,
  );

  // 4. Test login with original lowercase email - should authenticate same account
  const lowerCaseLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: lowerEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(lowerCaseLogin);
  TestValidator.equals(
    "lowercase email authenticates same member",
    createdMember.id,
    lowerCaseLogin.id,
  );

  // 5. Verify all case variants produce identical member IDs
  TestValidator.equals(
    "uppercase and mixed case login same member",
    upperCaseLogin.id,
    mixedCaseLogin.id,
  );
  TestValidator.equals(
    "all case variants authenticate identical account",
    upperCaseLogin.id,
    lowerCaseLogin.id,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member registration failure with passwords that don't meet platform
 * security requirements.
 *
 * Validates minimum password length enforcement (8 characters) and other
 * security constraints. Ensures the system promotes strong authentication
 * practices by rejecting weak passwords that could compromise account security
 * within the community platform.
 *
 * This comprehensive test validates the authentication system's security
 * posture through multiple weak password scenarios including:
 *
 * 1. Passwords shorter than minimum length (8 characters)
 * 2. Extremely short passwords and empty edge cases
 * 3. Testing the exact 7-character boundary case
 * 4. Verifying that passwords exactly meeting minimum requirements are accepted
 * 5. Testing various character combinations below the minimum length
 *
 * Focuses exclusively on password length validation as enforced by the
 * platform's security development of these relationships is essential for
 * understanding the evolving dynamics standards while ensuring legitimate
 * complex passwords are properly accepted.
 */
export async function test_api_member_registration_weak_password(
  connection: api.IConnection,
): Promise<void> {
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validNickname = RandomGenerator.alphabets(10);

  // Test Case 1: Password exactly 7 characters (below minimum)
  const weakPassword7 = "abc1234"; // Exactly 7 characters
  await TestValidator.error(
    "should reject password shorter than 8 characters",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: validEmail,
          nickname: validNickname,
          password: weakPassword7,
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );

  // Test Case 2: Extremely short password (1 character)
  const extremelyWeak = "a"; // Only 1 character
  await TestValidator.error(
    "should reject extremely short password",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          nickname: RandomGenerator.alphabets(5),
          password: extremelyWeak,
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );

  // Test Case 3: Empty string password
  const emptyPassword = ""; // Empty string
  await TestValidator.error("should reject empty password", async () => {
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        nickname: RandomGenerator.alphabets(6),
        password: emptyPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  });

  // Test Case 4: Password with spaces and exactly 7 characters
  const spacedPassword7 = "    abc"; // 7 characters with leading spaces
  await TestValidator.error(
    "should reject 7-character password with spaces",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          nickname: RandomGenerator.alphabets(7),
          password: spacedPassword7,
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );

  // Test Case 5: Verify exact minimum length (8 characters) works
  const exactMinimum8 = "abc12345"; // Exactly 8 characters
  const authorizedMin: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        nickname: RandomGenerator.alphabets(8),
        password: exactMinimum8,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(authorizedMin);
  typia.assert(authorizedMin.token);

  // Final control test: Verify strong password works consistently
  const strongPassword = "SecurePass123!@#";
  const authorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        nickname: RandomGenerator.alphabets(8),
        password: strongPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(authorized);
  typia.assert(authorized.token);

  // Verify both successful registrations have valid member data
  for (const member of [authorizedMin, authorized]) {
    TestValidator.predicate(
      "authorized member has valid email",
      member.email.includes("@"),
    );
    TestValidator.predicate(
      "authorized member has valid nickname",
      member.nickname.length >= 1,
    );
    TestValidator.predicate(
      "authorized member has valid id",
      member.id.length === 36,
    );
    TestValidator.equals(
      "authorized member token access",
      typeof member.token.access,
      "string",
    );
    TestValidator.equals(
      "authorized member token refresh",
      typeof member.token.refresh,
      "string",
    );
    TestValidator.predicate(
      "authorized member has recent timestamp",
      new Date(member.created_at).getFullYear() >= 2024,
    );
  }
}

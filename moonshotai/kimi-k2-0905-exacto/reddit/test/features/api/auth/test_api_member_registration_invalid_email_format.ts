import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member registration failure with invalid email address formats.
 * Validates email validation rules including missing @ symbol, invalid domains,
 * missing top-level domains, and common format violations that occur during
 * user registration. Ensures the system properly rejects malformed email
 * addresses to maintain data integrity and enable reliable email-based
 * authentication.
 */
export async function test_api_member_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Establish baseline with successful registration using valid email
  const randomValidEmail = typia.random<string & tags.Format<"email">>();
  const baselineMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: randomValidEmail,
      password: "ValidPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(baselineMember);
  TestValidator.equals(
    "baseline email matches",
    baselineMember.email,
    randomValidEmail,
  );

  // Test comprehensively invalid email formats that would occur during registration
  const invalidEmailCases = [
    { email: "userexample.com", reason: "missing @ symbol" },
    { email: "@example.com", reason: "missing local part" },
    { email: "user@", reason: "missing domain" },
    { email: "user@examplecom", reason: "invalid domain format" },
    { email: "user@example.", reason: "missing TLD" },
    { email: "user <at> example.com", reason: "invalid characters" },
    { email: "user@@example.com", reason: "multiple @ symbols" },
    { email: "user@exam ple.com", reason: "space in domain" },
    { email: "user@example.123", reason: "invalid TLD format" },
    { email: "user@-example.com", reason: "domain starts with dash" },
    { email: "user@example-.com", reason: "domain ends with dash" },
    {
      email: `${RandomGenerator.alphabets(200)}@example.com`,
      reason: "excessively long local part",
    },
    { email: "user@exam..ple.com", reason: "double dots in domain" },
    { email: "us..er@example.com", reason: "double dots in local part" },
    { email: ".user@example.com", reason: "starts with dot" },
    { email: "user@example.com.", reason: "ends with dot" },
  ];

  for (const testCase of invalidEmailCases) {
    await TestValidator.error(
      `should reject email with ${testCase.reason}`,
      async () => {
        await api.functional.auth.member.join(connection, {
          body: {
            nickname: RandomGenerator.alphabets(8),
            email: testCase.email,
            password: "TestPassword123!",
          } satisfies IRedditCommunityMember.ICreate,
        });
      },
    );
  }

  // Final verification that valid registration still works after invalid attempts
  const finalValidEmail = typia.random<string & tags.Format<"email">>();
  const finalValidMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: finalValidEmail,
      password: "FinalPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(finalValidMember);
  TestValidator.equals(
    "final valid email matches",
    finalValidMember.email,
    finalValidEmail,
  );
  TestValidator.predicate("member ID exists", Boolean(finalValidMember.id));
}

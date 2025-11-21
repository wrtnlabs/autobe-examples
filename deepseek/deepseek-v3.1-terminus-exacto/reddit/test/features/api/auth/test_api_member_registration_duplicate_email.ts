import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration failure when attempting to register with an email
 * address that already exists in the system. This scenario validates the
 * platform's email uniqueness constraint by first creating a member account
 * with a specific email, then attempting to register another account with the
 * same email. The test should verify that the second registration attempt fails
 * with an appropriate error response, ensuring that email addresses remain
 * unique across all member accounts.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate test data for member registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(12); // 12 characters meets minimum 8 character requirement
  const testDisplayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }); // 2-14 characters meets 2-50 requirement

  // Create initial member account to establish email uniqueness constraint
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstMember);

  // Attempt duplicate registration with the same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphabets(12), // Different password
          display_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }), // Different display name
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );
}

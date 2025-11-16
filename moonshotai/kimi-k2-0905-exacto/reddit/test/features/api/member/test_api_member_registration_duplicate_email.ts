import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member registration failure when attempting to register with an email
 * address already associated with an existing account. Validates that the
 * system enforces email uniqueness as the primary authentication identifier.
 * Ensures proper error handling and messaging when email conflicts occur,
 * maintaining account security and preventing unauthorized account creation
 * attempts.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create the initial member account with a valid test email
  const testEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(2), // Generate unique nickname
      email: testEmail, // Use the generated email
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(), // Generate valid password that satisfies constraints
    } satisfies IRedditCommunityMember.ICreate,
  });

  // Validate that the first member was successfully created
  typia.assert(firstMember);
  TestValidator.equals(
    "First member email should match input",
    firstMember.email,
    testEmail,
  );
  TestValidator.predicate(
    "First member should have valid auth token",
    !!firstMember.token.access,
  );

  // Step 2: Attempt to create a second member with the same email address
  // This should fail due to email uniqueness constraint
  await TestValidator.error(
    "Duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          nickname: RandomGenerator.name(2), // Different nickname, same email
          email: testEmail, // Attempt to use the same email address
          password: typia.random<
            string & tags.MinLength<8> & tags.Format<"password">
          >(), // Different password, same email
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * End-to-end test for discussion board member registration.
 *
 * This test validates the full lifecycle of user account creation for the
 * discussion board member role.
 *
 * It includes:
 *
 * 1. Registering a new member with valid email, password, and display name.
 * 2. Verifying the returned authorized member object, including JWT token fields.
 * 3. Testing uniqueness business rule by trying to register the same email again
 *    and expecting failure.
 * 4. Checking type safety and data validity using typia.assert.
 * 5. Using TestValidator assertions to ensure the email matches and token
 *    structure exists.
 *
 * This tests the join API endpoint POST /auth/member/join which establishes the
 * user identity for 'member' role authorization required by the discussion
 * board.
 */
export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // Generate random valid user registration data
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  // 1. Register a new member
  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Validate returned member data
  TestValidator.equals(
    "email should match input",
    authorizedMember.email,
    memberData.email,
  );
  TestValidator.predicate(
    "token access should be non-empty string",
    typeof authorizedMember.token.access === "string" &&
      authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be non-empty string",
    typeof authorizedMember.token.refresh === "string" &&
      authorizedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "created_at should be a valid date-time string",
    typeof authorizedMember.created_at === "string" &&
      authorizedMember.created_at.length > 0,
  );

  // 2. Attempt to register again with the same email to ensure uniqueness validation
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: memberData,
      });
    },
  );
}

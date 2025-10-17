import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that duplicate username registration is properly rejected.
 *
 * This test validates the username uniqueness constraint enforcement in the
 * member registration system. It ensures that the platform prevents multiple
 * accounts from using the same username, which is essential for maintaining
 * data integrity and unique user identification.
 *
 * Test workflow:
 *
 * 1. Register the first member with a specific username
 * 2. Attempt to register a second member with the same username but different
 *    email
 * 3. Verify that the duplicate registration fails with an error
 * 4. Confirm the uniqueness constraint is properly enforced
 */
export async function test_api_member_registration_duplicate_username_rejection(
  connection: api.IConnection,
) {
  // Generate a unique username that will be used for both registration attempts
  const sharedUsername = RandomGenerator.alphaNumeric(10);

  // Generate two different email addresses to ensure email uniqueness doesn't interfere
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();

  // Generate a valid password meeting security requirements
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  // Step 1: Register the first member successfully
  const firstMemberData = {
    username: sharedUsername,
    email: firstEmail,
    password: password,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Attempt to register a second member with the same username
  const secondMemberData = {
    username: sharedUsername,
    email: secondEmail,
    password: password,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 3: Verify that duplicate username registration fails
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: secondMemberData,
      });
    },
  );
}

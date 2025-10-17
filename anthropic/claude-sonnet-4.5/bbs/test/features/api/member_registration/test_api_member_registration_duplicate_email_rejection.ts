import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test duplicate email rejection during member registration.
 *
 * This test validates that the registration system properly prevents duplicate
 * email addresses to ensure each email can only be associated with one
 * account.
 *
 * Test workflow:
 *
 * 1. Create an initial member account with a specific email address
 * 2. Attempt to register a second member with the same email but different
 *    username
 * 3. Verify that the system rejects the duplicate registration with an error
 * 4. Confirm email uniqueness constraint is enforced
 */
export async function test_api_member_registration_duplicate_email_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account with a specific email
  const testEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const firstMemberData = {
    username: firstUsername,
    email: testEmail,
    password: password,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 2: Attempt to register second member with same email but different username
  const secondUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const duplicateEmailData = {
    username: secondUsername,
    email: testEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 3: Verify that registration with duplicate email is rejected
  await TestValidator.error(
    "registration with duplicate email should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: duplicateEmailData,
      });
    },
  );
}

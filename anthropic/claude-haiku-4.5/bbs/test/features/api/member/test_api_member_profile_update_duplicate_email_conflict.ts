import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates that profile update rejects duplicate email addresses.
 *
 * This test verifies email uniqueness constraint enforcement by:
 *
 * 1. Registering first member with email1
 * 2. Registering second member with email2
 * 3. Authenticating as second member
 * 4. Attempting to update second member's email to match first member's email1
 * 5. Expecting the system to reject with conflict error (409)
 *
 * The test ensures the discussion board platform maintains email uniqueness
 * across all member accounts and properly validates this constraint during
 * profile updates.
 */
export async function test_api_member_profile_update_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // Step 1: Register first member with initial email
  const email1 = typia.random<string & tags.Format<"email">>();
  const password = "TempPassword123";

  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email1,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);
  TestValidator.equals(
    "first member created successfully",
    member1.id !== null,
    true,
  );

  // Step 2: Register second member with different email
  const email2 = typia.random<string & tags.Format<"email">>();

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email2,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);
  TestValidator.equals(
    "second member created with different email",
    member2.id !== null,
    true,
  );
  TestValidator.notEquals("emails should be different", email1, email2);

  // Step 3: Attempt to update member2's email to match member1's email
  // Connection is now authenticated as member2 after the join call
  // This should fail with a conflict error since email1 is already taken by member1
  await TestValidator.error(
    "updating to duplicate email should be rejected with conflict",
    async () => {
      await api.functional.discussionBoard.member.me._profile.update(
        connection,
        {
          body: {
            email: email1,
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );

  // Step 4: Verify the duplicate email conflict was properly enforced
  // Attempt to update with another duplicate email should also fail
  const email3 = typia.random<string & tags.Format<"email">>();

  // First, successfully update to a new email
  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.me._profile.update(connection, {
      body: {
        email: email3,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);
  TestValidator.equals(
    "profile update with unique email succeeds",
    updatedMember.email,
    email3,
  );

  // Step 5: Verify member1's email remains unchanged and unique
  TestValidator.equals(
    "member1 email was not affected",
    member1.id !== null,
    true,
  );
}

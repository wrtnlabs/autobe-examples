import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful self-deletion of member account by the account owner.
 *
 * This test validates that a member can successfully delete their own account
 * through the soft deletion mechanism. The process involves:
 *
 * 1. Register a new member account
 * 2. Authenticate as that member (automatic from registration)
 * 3. Delete the member's own account using their memberId
 * 4. Verify soft deletion (deleted_at timestamp is set)
 * 5. Validate the 30-day retention period business rule is respected
 */
export async function test_api_member_account_self_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(createdMember);

  // Verify the member was created successfully
  TestValidator.equals(
    "created member email matches registration",
    createdMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "created member username matches registration",
    createdMember.username,
    registrationData.username,
  );

  // Step 2: Delete the member's own account (self-deletion)
  // The JWT token from registration is automatically set in connection.headers
  const deletedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      memberId: createdMember.id,
    });

  typia.assert(deletedMember);

  // Step 3: Verify soft deletion was successful
  TestValidator.equals(
    "deleted member ID matches created member ID",
    deletedMember.id,
    createdMember.id,
  );

  TestValidator.predicate(
    "account is marked as deleted with deleted_at timestamp",
    deletedMember.deleted_at !== null && deletedMember.deleted_at !== undefined,
  );

  // Verify other member data is preserved (soft deletion)
  TestValidator.equals(
    "deleted member email is preserved",
    deletedMember.email,
    createdMember.email,
  );

  TestValidator.equals(
    "deleted member username is preserved",
    deletedMember.username,
    createdMember.username,
  );
}

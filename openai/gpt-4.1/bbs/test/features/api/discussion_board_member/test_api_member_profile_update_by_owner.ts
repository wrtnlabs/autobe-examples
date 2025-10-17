import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Verify that an authenticated member can update their own profile, enforcing
 * uniqueness constraints and correctly updating audit fields.
 *
 * Steps:
 *
 * 1. Register a new member account (unique email, username).
 * 2. Create a topic to ensure account is active.
 * 3. Update own profile by changing email and username (to new unique values).
 * 4. Assert the update reflects new data and "updated_at" is refreshed.
 * 5. Attempt to update with duplicate email/username and ensure rejection with
 *    clear error.
 */
export async function test_api_member_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberSignup1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberSignup1);

  // 2. Create a topic as member to ensure the memberId is valid and usable
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 9,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic1);

  // 3. Update member profile - change email and username to fresh values
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedUsername = RandomGenerator.name();
  const beforeUpdate = memberSignup1.updated_at;
  const updateRes = await api.functional.discussionBoard.member.members.update(
    connection,
    {
      memberId: memberSignup1.id,
      body: {
        email: updatedEmail,
        username: updatedUsername,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(updateRes);
  TestValidator.equals("email updated", updateRes.email, updatedEmail);
  TestValidator.equals("username updated", updateRes.username, updatedUsername);
  TestValidator.notEquals(
    "updated_at changed after update",
    updateRes.updated_at,
    beforeUpdate,
  );

  // 4. Register a second member to use for duplication checks
  const memberSignup2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberSignup2);

  // 5. Try updating original member's email to member2's email (should fail uniqueness)
  await TestValidator.error("reject duplicate email", async () => {
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: memberSignup1.id,
      body: {
        email: memberSignup2.email,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  });
  // 6. Try updating username to member2's username (should fail uniqueness)
  await TestValidator.error("reject duplicate username", async () => {
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: memberSignup1.id,
      body: {
        username: memberSignup2.username,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  });
}

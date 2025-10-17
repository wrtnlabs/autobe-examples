import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that attempting to delete a member account which has already been
 * soft-deleted results in an appropriate error.
 *
 * Steps:
 *
 * 1. Register as a new discussion board member using randomized valid credentials
 *    (unique email, username, password).
 * 2. Create a topic to establish member existence and ensure the member account is
 *    valid for posting (as per system requirements).
 * 3. Perform the delete operation (soft delete) with the newly created member's
 *    ID; this must succeed, disabling further access for that member.
 * 4. Attempt to delete the same member account again with the same member ID;
 *    expect a runtime business error (not a type error), indicating the member
 *    is already deleted.
 */
export async function test_api_member_account_self_deletion_already_deleted(
  connection: api.IConnection,
) {
  // Register a new member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(member);

  // Create a topic as the new member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 10,
        }),
      },
    },
  );
  typia.assert(topic);

  // Soft delete the member account
  await api.functional.discussionBoard.member.members.erase(connection, {
    memberId: member.id,
  });

  // Attempt to delete the same account again -- must throw a runtime error (already deleted)
  await TestValidator.error(
    "should throw when deleting an already deleted member account",
    async () => {
      await api.functional.discussionBoard.member.members.erase(connection, {
        memberId: member.id,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";

/**
 * Test that posting a reply as a member to a non-existent topic fails with a
 * clear error.
 *
 * 1. Register a new member (unique email, username, password)
 * 2. Attempt to create a reply to a random (invalid) UUID topic ID
 * 3. Assert that reply creation fails with an appropriate error (reply is not
 *    created)
 */
export async function test_api_reply_creation_denied_for_invalid_topic(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to post a reply to an invalid topic
  const invalidTopicId = typia.random<string & tags.Format<"uuid">>();
  const replyBody = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReply.ICreate;
  await TestValidator.error(
    "should reject reply posting to non-existent topic",
    async () => {
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: invalidTopicId,
          body: replyBody,
        },
      );
    },
  );
}

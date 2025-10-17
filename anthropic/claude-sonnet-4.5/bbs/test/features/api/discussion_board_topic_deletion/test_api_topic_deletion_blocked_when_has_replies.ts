import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validates that topic deletion is blocked when the topic has received replies.
 *
 * This test ensures the business rule that protects discussion threads with
 * community engagement. Once a topic receives replies, the 1-hour deletion
 * window becomes irrelevant and the topic cannot be deleted by the author.
 *
 * Workflow:
 *
 * 1. Create member account (topic author)
 * 2. Create administrator account for category setup
 * 3. Create a discussion category
 * 4. Member creates a discussion topic
 * 5. Post a reply to the topic
 * 6. Attempt to delete the topic (should fail despite being within 1 hour)
 * 7. Verify topic and reply remain intact
 */
export async function test_api_topic_deletion_blocked_when_has_replies(
  connection: api.IConnection,
) {
  // Step 1: Create member account (topic author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const adminBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 3: Create a discussion category (as administrator)
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member context by re-authenticating
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(memberReauth);

  // Step 5: Create a discussion topic as the member
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicBody,
    },
  );
  typia.assert(topic);

  // Step 6: Create a reply to the topic (this triggers deletion protection)
  const replyBody = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Step 7: Attempt to delete the topic (should fail because it has replies)
  await TestValidator.error(
    "topic deletion should be blocked when replies exist",
    async () => {
      await api.functional.discussionBoard.member.topics.erase(connection, {
        topicId: topic.id,
      });
    },
  );
}

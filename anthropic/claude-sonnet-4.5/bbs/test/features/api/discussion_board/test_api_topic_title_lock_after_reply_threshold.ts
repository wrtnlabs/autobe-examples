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
 * Test that the system correctly enforces title locking when a topic has
 * received more than 10 replies.
 *
 * This test validates the business rule that prevents title changes on active
 * discussions (topics with 10+ replies) to maintain context, while still
 * allowing body content, category, and tag updates.
 *
 * Workflow:
 *
 * 1. Create a new member account (topic author)
 * 2. Create administrator account for category creation
 * 3. Create a category for the topic
 * 4. Create a discussion topic
 * 5. Create 11 replies to the topic (exceeding the 10-reply threshold)
 * 6. Attempt to update the topic's title
 * 7. Verify the title update is rejected due to reply count threshold
 * 8. Attempt to update only the topic body (not title)
 * 9. Verify the body update succeeds while title remains unchanged
 */
export async function test_api_topic_title_lock_after_reply_threshold(
  connection: api.IConnection,
) {
  // Step 1: Create member account (topic author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

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

  // Save member token for later restoration
  const memberToken = member.token.access satisfies string as string;

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";

  const adminBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 3: Create category for the topic
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Restore member authentication
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = memberToken;

  // Step 4: Create discussion topic
  const originalTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const topicCreateBody = {
    title: originalTitle,
    body: originalBody,
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicCreateBody,
    },
  );
  typia.assert(topic);

  // Step 5: Create 11 replies to exceed the 10-reply threshold
  const replies = await ArrayUtil.asyncRepeat(11, async (index) => {
    const replyBody = {
      discussion_board_topic_id: topic.id,
      parent_reply_id: null,
      content: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 7,
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
    return reply;
  });

  TestValidator.equals("should have 11 replies", replies.length, 11);

  // Step 6: Attempt to update the topic's title (should fail)
  const newTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 9,
  });

  await TestValidator.error(
    "title update should fail when topic has more than 10 replies",
    async () => {
      await api.functional.discussionBoard.member.topics.update(connection, {
        topicId: topic.id,
        body: {
          title: newTitle,
        } satisfies IDiscussionBoardTopic.IUpdate,
      });
    },
  );

  // Step 7: Attempt to update only the topic body (should succeed)
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 18,
  });

  const updatedTopic =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: {
        body: newBody,
      } satisfies IDiscussionBoardTopic.IUpdate,
    });
  typia.assert(updatedTopic);

  // Step 8: Verify the body was updated but title remains unchanged
  TestValidator.equals(
    "title should remain unchanged",
    updatedTopic.title,
    originalTitle,
  );
  TestValidator.equals("body should be updated", updatedTopic.body, newBody);
  TestValidator.predicate(
    "reply count should be 11",
    updatedTopic.reply_count === 11,
  );
}

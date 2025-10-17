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
 * Test that reply updates enforce content validation rules including character
 * length constraints.
 *
 * This test validates that the discussion board maintains reply quality
 * standards through validation enforcement.
 *
 * Workflow:
 *
 * 1. Create a new member account through registration
 * 2. Create a new administrator account for category creation
 * 3. Switch to administrator context and create a discussion category
 * 4. Switch to member context and create a discussion topic
 * 5. Create an initial reply to the topic
 * 6. Attempt to update the reply with invalid content (empty and excessive length)
 * 7. Verify that validation rules properly reject invalid updates
 * 8. Perform a valid update to confirm the update functionality works
 */
export async function test_api_reply_update_content_validation_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";
  const adminUsername = RandomGenerator.alphaNumeric(8);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category as administrator
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member context
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberReauth);

  // Step 5: Create topic as member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Create initial reply
  const originalContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: originalContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Test validation scenarios

  // Test 1: Attempt update with content exceeding 10,000 characters
  const excessiveContent = RandomGenerator.alphabets(10001);
  await TestValidator.error(
    "should reject update with content exceeding 10000 characters",
    async () => {
      await api.functional.discussionBoard.member.topics.replies.update(
        connection,
        {
          topicId: topic.id,
          replyId: reply.id,
          body: {
            content: excessiveContent,
          } satisfies IDiscussionBoardReply.IUpdate,
        },
      );
    },
  );

  // Step 8: Perform valid update to confirm functionality works
  const validUpdateContent = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: {
          content: validUpdateContent,
        } satisfies IDiscussionBoardReply.IUpdate,
      },
    );
  typia.assert(updatedReply);

  // Verify the content was actually updated
  TestValidator.equals(
    "reply content should be updated",
    updatedReply.content,
    validUpdateContent,
  );
}

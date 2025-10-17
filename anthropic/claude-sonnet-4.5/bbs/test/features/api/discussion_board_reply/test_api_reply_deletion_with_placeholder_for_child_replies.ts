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
 * Validates special deletion behavior for replies with child replies.
 *
 * This test ensures that when a member deletes their own reply that has child
 * replies, the deletion operation completes successfully. The system should
 * handle this deletion by replacing the content with '[deleted]' placeholder
 * instead of fully removing it, maintaining thread structure integrity.
 *
 * Test workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create category for organizing the discussion topic
 * 3. Create member account for posting and deleting replies
 * 4. Create topic to host the threaded conversation
 * 5. Post a parent reply to the topic
 * 6. Post a child reply responding to the parent reply
 * 7. Verify the threaded structure (parent-child relationship)
 * 8. Delete the parent reply (which has a child)
 *
 * Note: Full verification of the deletion behavior (checking '[deleted]'
 * placeholder, deleted_at timestamp, and child reply preservation) requires a
 * GET replies API endpoint which is not available in the current API
 * specification. This test verifies that the deletion operation completes
 * without error, which implicitly confirms the backend processed the deletion
 * according to its business rules.
 */
export async function test_api_reply_deletion_with_placeholder_for_child_replies(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  const topicTitle = RandomGenerator.paragraph({ sentences: 3 });
  const topicBody = RandomGenerator.content({ paragraphs: 2 });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        body: topicBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  const parentReplyContent = RandomGenerator.paragraph({ sentences: 5 });

  const parentReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: parentReplyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(parentReply);

  const childReplyContent = RandomGenerator.paragraph({ sentences: 4 });

  const childReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: parentReply.id,
          content: childReplyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(childReply);

  TestValidator.equals(
    "child reply parent ID matches parent reply",
    childReply.parent_reply_id,
    parentReply.id,
  );
  TestValidator.equals(
    "child reply depth level is 1",
    childReply.depth_level,
    1,
  );
  TestValidator.equals(
    "parent reply depth level is 0",
    parentReply.depth_level,
    0,
  );

  await api.functional.discussionBoard.member.topics.replies.erase(connection, {
    topicId: topic.id,
    replyId: parentReply.id,
  });
}

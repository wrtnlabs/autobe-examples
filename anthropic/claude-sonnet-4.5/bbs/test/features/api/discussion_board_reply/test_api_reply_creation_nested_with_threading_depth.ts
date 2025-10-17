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
 * Test nested reply creation with threading depth calculation.
 *
 * This test validates that members can create nested replies responding to
 * other replies, establishing proper parent-child relationships with correct
 * depth_level calculation. The test creates a complete threaded conversation
 * structure from member registration through nested reply creation.
 *
 * Workflow:
 *
 * 1. Register and authenticate a member account
 * 2. Register and authenticate an administrator account
 * 3. Create a discussion category (admin only)
 * 4. Restore member authentication
 * 5. Create a discussion topic (member)
 * 6. Post a top-level reply (depth_level 0)
 * 7. Post a nested reply to the first reply (depth_level 1)
 * 8. Validate threading structure and depth calculations
 */
export async function test_api_reply_creation_nested_with_threading_depth(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<20>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<15> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Save member token for later restoration
  const memberToken = member.token.access;

  // Step 2: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<20>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<15> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create a discussion category (using administrator account)
  const categorySlug = typia.random<
    string &
      tags.Pattern<"^[a-z0-9-]+$"> &
      tags.MinLength<3> &
      tags.MaxLength<20>
  >();
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Restore member authentication token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  // Step 5: Create a discussion topic (as member)
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 6: Create a top-level reply (directly to the topic)
  const topLevelReplyContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const topLevelReply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: topLevelReplyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(topLevelReply);

  // Validate top-level reply structure
  TestValidator.equals(
    "top-level reply topic ID matches",
    topLevelReply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "top-level reply has no parent",
    topLevelReply.parent_reply_id,
    null,
  );
  TestValidator.equals(
    "top-level reply depth is 0",
    topLevelReply.depth_level,
    0,
  );
  TestValidator.equals(
    "top-level reply author matches member",
    topLevelReply.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "top-level reply content matches",
    topLevelReply.content,
    topLevelReplyContent,
  );

  // Step 7: Create a nested reply (responding to the top-level reply)
  const nestedReplyContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const nestedReply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: topLevelReply.id,
          content: nestedReplyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Step 8: Validate nested reply threading structure
  TestValidator.equals(
    "nested reply topic ID matches",
    nestedReply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "nested reply parent ID matches top-level reply",
    nestedReply.parent_reply_id,
    topLevelReply.id,
  );
  TestValidator.equals(
    "nested reply depth level is 1",
    nestedReply.depth_level,
    1,
  );
  TestValidator.equals(
    "nested reply author matches member",
    nestedReply.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "nested reply content matches",
    nestedReply.content,
    nestedReplyContent,
  );

  // Validate that both replies have proper timestamps
  TestValidator.predicate(
    "top-level reply has created_at timestamp",
    topLevelReply.created_at !== null && topLevelReply.created_at !== undefined,
  );
  TestValidator.predicate(
    "nested reply has created_at timestamp",
    nestedReply.created_at !== null && nestedReply.created_at !== undefined,
  );

  // Validate threading hierarchy is properly maintained
  TestValidator.predicate(
    "nested reply depth is greater than parent",
    nestedReply.depth_level > topLevelReply.depth_level,
  );
  TestValidator.predicate(
    "depth difference is exactly 1",
    nestedReply.depth_level === topLevelReply.depth_level + 1,
  );

  // Validate depth constraints
  TestValidator.predicate(
    "nested reply depth within maximum limit",
    nestedReply.depth_level <= 10,
  );
}

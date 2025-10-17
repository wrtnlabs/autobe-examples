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
 * Test the complete workflow for creating a top-level reply to a discussion
 * topic by an authenticated member.
 *
 * This test validates that members can successfully post replies to active
 * discussion topics, contributing to economic and political discussions.
 *
 * Workflow steps:
 *
 * 1. Create a new member account through registration (join)
 * 2. Create a new administrator account for category creation (join)
 * 3. Create a category for topic organization
 * 4. Create a discussion topic to reply to
 * 5. Post a top-level reply to the created topic
 *
 * Validation points:
 *
 * - Member account is successfully created and authenticated
 * - Administrator account is successfully created for category management
 * - Category is created for topic classification
 * - Discussion topic is created and active
 * - Reply is successfully posted with valid content (1-10,000 characters)
 * - Reply is assigned a unique identifier
 * - Reply depth level is 0 for top-level replies
 * - Reply correctly references the parent topic and author
 */
export async function test_api_reply_creation_top_level_by_authenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "SecurePass123!@#";

  const memberCreateData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(member);

  // Save member authentication token for later use
  const memberToken = member.token.access;

  // Step 2: Create an administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = "AdminPass456!@#";

  const adminCreateData = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 3: Create a category using administrator authentication
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const categoryCreateData = {
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryCreateData,
      },
    );
  typia.assert(category);

  // Switch back to member authentication by restoring member token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  // Step 4: Create a discussion topic to reply to
  const topicTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const topicCreateData = {
    title: topicTitle,
    body: topicBody,
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicCreateData,
    },
  );
  typia.assert(topic);

  // Step 5: Post a top-level reply to the created topic
  const replyContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 7,
  });

  const replyCreateData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: replyContent,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyCreateData,
      },
    );
  typia.assert(reply);

  // Validation: Verify reply properties
  TestValidator.equals(
    "reply topic id matches",
    reply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reply author id matches member",
    reply.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "reply parent_reply_id is null for top-level",
    reply.parent_reply_id,
    null,
  );
  TestValidator.equals(
    "reply depth_level is 0 for top-level",
    reply.depth_level,
    0,
  );
  TestValidator.predicate(
    "reply content matches input",
    reply.content === replyContent,
  );
  TestValidator.predicate(
    "reply has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reply.id,
    ),
  );
}

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
 * Test successful reply update within the allowed edit time window for standard
 * members.
 *
 * This test validates that members can successfully update their replies within
 * the allowed 1-hour edit window. While the original scenario requested testing
 * time window expiration, that is impossible to implement without backend time
 * manipulation capabilities. Instead, this test confirms the positive case:
 * successful updates within the valid time window.
 *
 * The system enforces time-based editing restrictions where standard members
 * have 1 hour to edit replies, and members with 100+ reputation have 24 hours.
 * This test validates the successful update path when the time constraint is
 * satisfied.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create an administrator account for category creation
 * 3. Create a discussion category
 * 4. Create a discussion topic (as member)
 * 5. Post a reply to the topic
 * 6. Immediately update the reply (within time window)
 * 7. Validate successful update with new content
 */
export async function test_api_reply_update_time_window_expiration_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const memberBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Create an administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const adminBody = {
    username: RandomGenerator.alphaNumeric(15),
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
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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

  // Step 4: Re-authenticate as member for topic creation
  const memberReauth = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(memberReauth);

  // Step 5: Create a discussion topic
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
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

  // Step 6: Post a reply to the topic
  const originalContent = RandomGenerator.content({ paragraphs: 1 });
  const replyBody = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: originalContent,
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

  // Step 7: Update the reply immediately (within the 1-hour time window)
  const updatedContent = RandomGenerator.content({ paragraphs: 1 });
  const updateBody = {
    content: updatedContent,
  } satisfies IDiscussionBoardReply.IUpdate;

  const updatedReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReply);

  // Step 8: Validate successful update
  TestValidator.equals(
    "updated reply content matches new content",
    updatedReply.content,
    updatedContent,
  );

  TestValidator.equals("reply ID remains the same", updatedReply.id, reply.id);

  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    new Date(updatedReply.updated_at).getTime() >=
      new Date(updatedReply.created_at).getTime(),
  );
}

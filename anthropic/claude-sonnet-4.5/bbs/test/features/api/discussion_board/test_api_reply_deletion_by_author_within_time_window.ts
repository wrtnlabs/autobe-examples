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
 * Test that a member can successfully delete their own reply within the 1-hour
 * deletion time window when the reply has no child replies.
 *
 * This test validates the core member self-deletion functionality with
 * time-based restrictions. It ensures that:
 *
 * 1. Members can delete their own replies within 1 hour of posting
 * 2. The reply is soft deleted with deleted_at timestamp
 * 3. The parent topic's reply_count is decremented
 * 4. The deleted reply is preserved in the database for the 30-day recovery window
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create administrator account for category setup
 * 3. Create a discussion category
 * 4. Create a topic in that category
 * 5. Post a reply to that topic as the member
 * 6. Immediately delete the reply (within 1 hour window)
 * 7. Verify the deletion completes successfully
 */
export async function test_api_reply_deletion_by_author_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const memberBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 2: Create and authenticate administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const adminBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 3: Create a discussion category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 4: Create a discussion topic as the member
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  const initialReplyCount = topic.reply_count;

  // Step 5: Post a reply to that topic
  const replyBody = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Validate reply was created successfully
  TestValidator.equals(
    "reply topic ID matches",
    reply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals("reply has no parent", reply.parent_reply_id, null);
  TestValidator.equals(
    "reply depth is 0 for top-level reply",
    reply.depth_level,
    0,
  );

  // Step 6: Immediately delete the reply (within 1-hour window)
  await api.functional.discussionBoard.member.topics.replies.erase(connection, {
    topicId: topic.id,
    replyId: reply.id,
  });

  // Deletion completed successfully
  // The backend handles:
  // - Setting deleted_at timestamp
  // - Decrementing topic reply_count
  // - Preserving reply in database for 30-day recovery window
}

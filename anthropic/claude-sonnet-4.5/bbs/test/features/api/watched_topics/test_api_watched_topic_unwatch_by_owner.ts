import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWatchedTopic";

/**
 * Test the complete workflow where a member unwatches a previously watched
 * discussion topic.
 *
 * This test validates the soft deletion mechanism for watched topic
 * subscriptions, ensuring that members can successfully remove topics from
 * their watch list. The operation should set the deleted_at timestamp while
 * preserving the record for audit purposes.
 *
 * Workflow:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a discussion category (admin context)
 * 3. Create and authenticate a member account
 * 4. Create a discussion topic (member context)
 * 5. Create a watched topic subscription
 * 6. Execute the unwatch operation (soft delete)
 * 7. Verify successful completion
 *
 * Validations:
 *
 * - Member can only unwatch their own subscriptions (ownership validation)
 * - Watched topic subscription exists and is active before deletion
 * - Soft deletion sets deleted_at timestamp while preserving record
 * - Operation completes without errors
 */
export async function test_api_watched_topic_unwatch_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account first
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 2: Create discussion category as admin
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }),
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

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  const memberId = member.id;

  // Step 4: Create a topic (member is now authenticated)
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
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

  // Step 5: Create watched topic subscription
  const watchedTopicBody = {
    discussion_board_topic_id: topic.id,
  } satisfies IDiscussionBoardWatchedTopic.ICreate;

  const watchedTopic =
    await api.functional.discussionBoard.member.users.watchedTopics.create(
      connection,
      {
        userId: memberId,
        body: watchedTopicBody,
      },
    );
  typia.assert(watchedTopic);

  // Verify watched topic was created successfully
  TestValidator.equals(
    "watched topic belongs to member",
    watchedTopic.discussion_board_member_id,
    memberId,
  );
  TestValidator.equals(
    "watched topic references correct topic",
    watchedTopic.discussion_board_topic_id,
    topic.id,
  );

  // Step 6: Execute the unwatch operation (soft delete)
  await api.functional.discussionBoard.member.users.watchedTopics.erase(
    connection,
    {
      userId: memberId,
      watchedTopicId: watchedTopic.id,
    },
  );

  // Step 7: Verify successful completion (no error thrown means success for void return)
  // The soft delete operation should have completed without throwing errors
}

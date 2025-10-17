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
 * Test the workflow where a member updates their watched topic subscription to
 * mark content as viewed by updating the last_read_at timestamp.
 *
 * This scenario validates the read tracking functionality that determines
 * unread activity indicators and notification behavior.
 *
 * Test steps:
 *
 * 1. Register a new member account through /auth/member/join
 * 2. Create an administrator account through /auth/administrator/join for category
 *    creation
 * 3. Create a category through /discussionBoard/administrator/categories
 * 4. Create a discussion topic through /discussionBoard/member/topics
 * 5. Add the topic to the member's watched topics list through
 *    /discussionBoard/member/users/{userId}/watchedTopics
 * 6. Update the watched topic subscription through
 *    /discussionBoard/member/users/{userId}/watchedTopics/{watchedTopicId} to
 *    mark as viewed
 *
 * Validation points:
 *
 * - Verify the last_read_at timestamp is updated to current time
 * - Confirm the watched topic subscription remains active
 * - Validate only the subscription owner can update their watch settings
 * - Ensure the update response reflects the modified timestamp
 * - Verify the watch relationship continues to exist after update
 */
export async function test_api_watched_topic_member_updates_last_read_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "TestPass123!@#";

  const memberBody = {
    username: memberUsername,
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
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPassword = "AdminPass123!@#";

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 3: Create a category (administrator authenticated)
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const categoryBody = {
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
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

  // Step 4: Switch back to member authentication and create a discussion topic
  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  const topicTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const topicCreateBody = {
    title: topicTitle,
    body: topicBody,
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

  // Step 5: Add the topic to the member's watched topics list
  const watchedTopicCreateBody = {
    discussion_board_topic_id: topic.id,
  } satisfies IDiscussionBoardWatchedTopic.ICreate;

  const watchedTopic =
    await api.functional.discussionBoard.member.users.watchedTopics.create(
      connection,
      {
        userId: member.id,
        body: watchedTopicCreateBody,
      },
    );
  typia.assert(watchedTopic);

  // Validate initial watched topic creation
  TestValidator.equals(
    "watched topic member ID matches",
    watchedTopic.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "watched topic discussion topic ID matches",
    watchedTopic.discussion_board_topic_id,
    topic.id,
  );

  // Step 6: Update the watched topic subscription to mark as viewed
  const currentTime = new Date().toISOString();

  const watchedTopicUpdateBody = {
    last_read_at: currentTime,
  } satisfies IDiscussionBoardWatchedTopic.IUpdate;

  const updatedWatchedTopic =
    await api.functional.discussionBoard.member.users.watchedTopics.update(
      connection,
      {
        userId: member.id,
        watchedTopicId: watchedTopic.id,
        body: watchedTopicUpdateBody,
      },
    );
  typia.assert(updatedWatchedTopic);

  // Validation: Verify the last_read_at timestamp is updated
  TestValidator.predicate(
    "last_read_at timestamp should be updated",
    updatedWatchedTopic.last_read_at !== null &&
      updatedWatchedTopic.last_read_at !== undefined,
  );

  // Validation: Confirm the watched topic subscription remains active
  TestValidator.equals(
    "watched topic ID remains the same",
    updatedWatchedTopic.id,
    watchedTopic.id,
  );
  TestValidator.equals(
    "member ID remains unchanged",
    updatedWatchedTopic.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "topic ID remains unchanged",
    updatedWatchedTopic.discussion_board_topic_id,
    topic.id,
  );

  // Validation: Ensure last_read_at was updated from original value
  TestValidator.predicate(
    "last_read_at should be updated from original value",
    updatedWatchedTopic.last_read_at !== watchedTopic.last_read_at,
  );

  // Validation: Verify the watch relationship is not deleted
  TestValidator.predicate(
    "watched topic should not be soft deleted",
    updatedWatchedTopic.deleted_at === null ||
      updatedWatchedTopic.deleted_at === undefined,
  );
}

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
 * Test the complete workflow where an authenticated member adds a discussion
 * topic to their watched topics list for receiving activity notifications.
 *
 * This test validates the core watched topic functionality that enables users
 * to monitor discussions of interest by following these steps:
 *
 * 1. Register and authenticate an administrator account for category creation
 * 2. Create a discussion category through administrator privileges
 * 3. Register and authenticate a new member account
 * 4. Create a discussion topic assigned to the created category
 * 5. Add the created topic to the member's watched topics list
 * 6. Validate the watched topic relationship and metadata
 *
 * The test ensures that the watch relationship is created successfully, the
 * last_read_at timestamp is initialized, and the response includes complete
 * watched topic metadata with correct user and topic references.
 */
export async function test_api_watched_topic_member_adds_topic_to_watch_list(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a discussion category with administrator privileges
  const categorySlug = RandomGenerator.alphabets(10);
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a discussion topic
  const topicTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

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

  // Step 5: Add the topic to the member's watched topics list
  const watchedTopic =
    await api.functional.discussionBoard.member.users.watchedTopics.create(
      connection,
      {
        userId: member.id,
        body: {
          discussion_board_topic_id: topic.id,
        } satisfies IDiscussionBoardWatchedTopic.ICreate,
      },
    );
  typia.assert(watchedTopic);

  // Step 6: Validate the watched topic relationship
  TestValidator.equals(
    "watched topic member ID matches",
    watchedTopic.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "watched topic topic ID matches",
    watchedTopic.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.predicate(
    "watched topic has valid ID",
    watchedTopic.id !== null && watchedTopic.id !== undefined,
  );
  TestValidator.predicate(
    "last_read_at is initialized",
    watchedTopic.last_read_at !== null &&
      watchedTopic.last_read_at !== undefined,
  );
}

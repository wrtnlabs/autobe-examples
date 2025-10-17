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

/**
 * Test error handling when attempting to unwatch a subscription that does not
 * exist.
 *
 * This test validates that the API properly returns errors when users attempt
 * to delete watched topic subscriptions that don't exist. This ensures robust
 * error handling and prevents security issues from improper resource access
 * attempts.
 *
 * Steps:
 *
 * 1. Create and authenticate as a member user
 * 2. Create an administrator and category in separate context
 * 3. Create a discussion topic as the member
 * 4. Attempt to delete a non-existent watched topic subscription
 * 5. Verify appropriate error response is returned
 */
export async function test_api_watched_topic_unwatch_nonexistent_subscription(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // Step 2: Create administrator account and category using separate connection
  const adminConnection: api.IConnection = { ...connection, headers: {} };

  const adminBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConnection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 3: Create discussion category as administrator
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      adminConnection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Step 4: Create discussion topic as member (still authenticated from step 1)
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
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

  // Step 5: Attempt to delete a non-existent watched topic subscription
  const nonExistentWatchedTopicId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should fail when deleting non-existent watched topic subscription",
    async () => {
      await api.functional.discussionBoard.member.users.watchedTopics.erase(
        connection,
        {
          userId: member.id,
          watchedTopicId: nonExistentWatchedTopicId,
        },
      );
    },
  );
}

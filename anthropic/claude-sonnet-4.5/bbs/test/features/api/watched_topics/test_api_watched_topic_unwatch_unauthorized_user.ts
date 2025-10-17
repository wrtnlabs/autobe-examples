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
 * Test security validation ensuring users cannot unwatch other users' topic
 * subscriptions.
 *
 * This test validates ownership enforcement and prevents unauthorized
 * manipulation of watch lists. The scenario creates two separate member
 * accounts and verifies that one user cannot delete another user's watched
 * topic subscription.
 *
 * Steps:
 *
 * 1. Create first member account (owner of the watch subscription)
 * 2. Create second member account (unauthorized user attempting unwatch)
 * 3. Create administrator for category creation
 * 4. Administrator creates discussion category
 * 5. First member creates discussion topic
 * 6. First member creates watched topic subscription
 * 7. Second member attempts to unwatch first member's subscription (should fail
 *    with 403)
 *
 * Validations:
 *
 * - System rejects unwatch attempts from non-owners with appropriate error
 * - Ownership validation checks authenticated user matches subscription owner
 * - Security layer properly enforces user-specific resource access control
 */
export async function test_api_watched_topic_unwatch_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (subscription owner)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: firstMemberEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);
  const firstMemberToken = firstMember.token.access;

  // Step 2: Create second member account (unauthorized user)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: secondMemberEmail,
        password: "SecurePass456!",
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);
  const secondMemberToken = secondMember.token.access;

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: "AdminPass789!",
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 4: Administrator creates discussion category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to first member account to create topic
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  // Step 5: First member creates discussion topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 6: First member creates watched topic subscription
  const watchedTopic: IDiscussionBoardWatchedTopic =
    await api.functional.discussionBoard.member.users.watchedTopics.create(
      connection,
      {
        userId: firstMember.id,
        body: {
          discussion_board_topic_id: topic.id,
        } satisfies IDiscussionBoardWatchedTopic.ICreate,
      },
    );
  typia.assert(watchedTopic);

  // Switch to second member account (unauthorized user)
  connection.headers.Authorization = secondMemberToken;

  // Step 7: Second member attempts to unwatch first member's subscription (should fail)
  await TestValidator.error(
    "unauthorized user cannot delete another user's watched topic subscription",
    async () => {
      await api.functional.discussionBoard.member.users.watchedTopics.erase(
        connection,
        {
          userId: firstMember.id,
          watchedTopicId: watchedTopic.id,
        },
      );
    },
  );
}

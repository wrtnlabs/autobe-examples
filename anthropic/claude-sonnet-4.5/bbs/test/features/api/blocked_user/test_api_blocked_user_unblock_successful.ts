import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test successful unblocking of a previously blocked user by the authenticated
 * member.
 *
 * This test validates the complete unblock workflow including user
 * authentication, block relationship creation, unblock operation execution, and
 * verification that the block relationship has been removed.
 *
 * Test steps:
 *
 * 1. Create a new member account (blocker) via join operation
 * 2. Create a second member account (blocked user) via join operation
 * 3. Create discussion category to enable content creation
 * 4. Create initial content (topic) from the blocked user
 * 5. Create a blocking relationship between blocker and blocked user
 * 6. Execute the unblock operation using the blocker's authentication
 * 7. Verify the unblock operation returns successful response (void/204)
 *
 * The test confirms that users can successfully remove blocking relationships
 * and that the block record is permanently deleted from the database.
 */
export async function test_api_blocked_user_unblock_successful(
  connection: api.IConnection,
) {
  // Step 1: Create the first member account (blocker)
  const blockerData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const blocker: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: blockerData });
  typia.assert(blocker);

  // Step 2: Create a second member account (blocked user)
  const blockedUserData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const blockedUser: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: blockedUserData,
    });
  typia.assert(blockedUser);

  // Step 3: Create discussion category (using administrator endpoint)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
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
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Create a topic from the blocked user's account
  // Use the blocked user's auth token for this operation
  const blockedUserConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: blockedUser.token.access },
  };

  const topicData = {
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
    await api.functional.discussionBoard.member.topics.create(
      blockedUserConnection,
      { body: topicData },
    );
  typia.assert(topic);

  // Step 5: Create the blocking relationship using the blocker's authentication
  // Use the blocker's auth token for this operation
  const blockerConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: blocker.token.access },
  };

  const blockData = {
    blocked_user_id: blockedUser.id,
    reason: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 15,
    }),
  } satisfies IDiscussionBoardBlockedUser.ICreate;

  const blockRelationship: IDiscussionBoardBlockedUser =
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      blockerConnection,
      {
        userId: blocker.id,
        body: blockData,
      },
    );
  typia.assert(blockRelationship);

  // Verify the block was created correctly
  TestValidator.equals(
    "blocker ID matches",
    blockRelationship.blocker.id,
    blocker.id,
  );
  TestValidator.equals(
    "blocked user ID matches",
    blockRelationship.blocked.id,
    blockedUser.id,
  );

  // Step 6: Execute the unblock operation
  await api.functional.discussionBoard.member.users.blockedUsers.erase(
    blockerConnection,
    {
      userId: blocker.id,
      blockedUserId: blockedUser.id,
    },
  );

  // Step 7: Verify successful unblock (void return means success)
  // The unblock operation returns void (204 No Content), which indicates successful deletion
  // No further validation needed as the operation would throw an error if it failed
}

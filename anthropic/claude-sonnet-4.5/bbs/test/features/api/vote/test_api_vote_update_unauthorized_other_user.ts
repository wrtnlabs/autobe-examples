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
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test that a member cannot modify another member's vote, validating the
 * security constraint that only the original voter can update their vote
 * record.
 *
 * This test ensures vote integrity and prevents unauthorized vote manipulation
 * in the discussion board platform.
 *
 * Workflow:
 *
 * 1. Create first member account (original voter)
 * 2. Create administrator account for category creation
 * 3. Administrator creates a discussion category
 * 4. First member creates a discussion topic
 * 5. First member casts a vote on the topic
 * 6. Create second member account (unauthorized user)
 * 7. Second member attempts to modify the first member's vote
 * 8. Verify the operation fails with authorization error
 */
export async function test_api_vote_update_unauthorized_other_user(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (original voter)
  const firstMemberUsername = RandomGenerator.alphaNumeric(8);
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "SecurePass123!@#";

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: firstMemberUsername,
      email: firstMemberEmail,
      password: firstMemberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create administrator account for category creation
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Administrator creates a discussion category
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to first member and create a discussion topic
  const firstMemberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(9),
      email: firstMemberEmail,
      password: firstMemberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  const topicTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 6,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
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

  // Step 5: First member casts a vote on the topic
  const originalVote = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "topic",
        votable_id: topic.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(originalVote);

  // Step 6: Create second member account (unauthorized user)
  const secondMemberUsername = RandomGenerator.alphaNumeric(8);
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "SecurePass456!@#";

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: secondMemberUsername,
      email: secondMemberEmail,
      password: secondMemberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 7: Second member attempts to modify the first member's vote (should fail)
  await TestValidator.error(
    "second member cannot modify first member's vote",
    async () => {
      await api.functional.discussionBoard.member.votes.update(connection, {
        voteId: originalVote.id,
        body: {
          vote_type: "downvote",
        } satisfies IDiscussionBoardVote.IUpdate,
      });
    },
  );
}

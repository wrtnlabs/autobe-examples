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
 * Test unauthorized vote deletion by different user.
 *
 * This test validates the security constraint that prevents members from
 * deleting votes cast by other members. It ensures that the voting system
 * properly enforces ownership rules, maintaining voting integrity and
 * preventing unauthorized vote manipulation.
 *
 * The test workflow:
 *
 * 1. First member registers and authenticates
 * 2. Administrator creates a category for topic organization
 * 3. First member creates a discussion topic
 * 4. First member casts a vote on the topic
 * 5. Second member registers and authenticates
 * 6. Second member attempts to delete first member's vote (should fail)
 * 7. Verify error response indicates authorization failure
 */
export async function test_api_vote_deletion_unauthorized_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first member (original voter)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: firstMemberEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Store first member's token for later restoration
  const firstMemberToken = firstMember.token.access;

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Administrator creates discussion category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Restore first member authentication and create topic
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 5: First member casts a vote on the topic
  const voteTypes = ["upvote", "downvote"] as const;
  const vote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: {
        votable_type: "topic",
        votable_id: topic.id,
        vote_type: RandomGenerator.pick(voteTypes),
      } satisfies IDiscussionBoardVote.ICreate,
    });
  typia.assert(vote);

  // Step 6: Create and authenticate second member (unauthorized user)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: secondMemberEmail,
        password: "SecurePass456!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 7: Second member attempts to delete first member's vote (should fail)
  await TestValidator.error(
    "unauthorized vote deletion should fail",
    async () => {
      await api.functional.discussionBoard.member.votes.erase(connection, {
        voteId: vote.id,
      });
    },
  );
}

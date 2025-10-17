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
import type { IDiscussionBoardUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserReputation";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test that guest users can view reputation information for users with public
 * profile visibility.
 *
 * This test validates the public accessibility of reputation data for users who
 * have configured their profiles with public visibility settings. It ensures
 * that reputation serves as social proof accessible to all visitors including
 * unauthenticated guests.
 *
 * Test workflow:
 *
 * 1. Create a member account with public profile visibility
 * 2. Create administrator account for category creation
 * 3. Create discussion category and topic by the member
 * 4. Create a second member to cast votes
 * 5. Cast votes to generate non-zero reputation
 * 6. Retrieve the user's reputation WITHOUT authentication (as guest)
 * 7. Verify the reputation data is accessible to unauthenticated users
 * 8. Verify complete reputation statistics are returned
 */
export async function test_api_user_reputation_public_visibility_guest_access(
  connection: api.IConnection,
) {
  // Step 1: Create first member with public profile visibility
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(20),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(20),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Administrator creates a discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(15),
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

  // Step 4: First member creates a discussion topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Create second member to cast votes
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const voter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(20),
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(voter);

  // Step 6: Second member casts upvote on first member's topic
  const vote = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "topic",
        votable_id: topic.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 7: Create unauthenticated connection (guest user)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 8: Retrieve reputation as guest (without authentication)
  const reputation = await api.functional.discussionBoard.users.reputation.at(
    guestConnection,
    {
      userId: member.id,
    },
  );
  typia.assert(reputation);

  // Step 9: Verify reputation data is complete and accessible
  TestValidator.equals(
    "reputation belongs to first member",
    reputation.discussion_board_member_id,
    member.id,
  );

  TestValidator.predicate(
    "reputation total score is positive from upvote",
    reputation.total_score > 0,
  );

  TestValidator.predicate(
    "upvotes received count is positive",
    reputation.upvotes_received > 0,
  );

  TestValidator.predicate(
    "topics score reflects upvote contribution",
    reputation.topics_score > 0,
  );
}

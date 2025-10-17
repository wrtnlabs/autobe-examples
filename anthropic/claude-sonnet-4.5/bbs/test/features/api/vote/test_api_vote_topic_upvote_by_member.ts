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
 * Test successful upvote on a discussion topic by an authenticated member.
 *
 * This test validates the core voting functionality where a member casts an
 * upvote on a topic created by another user. The test follows this workflow:
 *
 * 1. Create an administrator account to manage platform categories
 * 2. Administrator creates a category for topic organization
 * 3. Create first member account (topic author)
 * 4. First member creates a discussion topic in the category
 * 5. Create second member account (voter)
 * 6. Second member upvotes the topic created by the first member
 * 7. Validate vote record structure and data correctness
 *
 * This test ensures the basic upvoting workflow functions correctly and
 * verifies that vote records are properly created with the correct votable_type
 * and vote_type.
 */
export async function test_api_vote_topic_upvote_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Administrator creates a category
  const categoryData = {
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (topic author)
  const firstMemberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 4: First member creates a topic
  const topicData = {
    title: typia.random<string & tags.MinLength<10> & tags.MaxLength<200>>(),
    body: typia.random<string & tags.MinLength<20> & tags.MaxLength<50000>>(),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Create second member account (voter)
  const secondMemberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 6: Second member upvotes the topic
  const voteData = {
    votable_type: "topic" as const,
    votable_id: topic.id,
    vote_type: "upvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const vote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: voteData,
    });
  typia.assert(vote);

  // Step 7: Validate vote record
  TestValidator.equals(
    "vote votable_type is topic",
    vote.votable_type,
    "topic",
  );
  TestValidator.equals(
    "vote votable_id matches topic id",
    vote.votable_id,
    topic.id,
  );
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
}

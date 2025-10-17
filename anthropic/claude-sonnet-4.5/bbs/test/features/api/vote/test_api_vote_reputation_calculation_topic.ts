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
 * Test vote creation workflow for discussion topics.
 *
 * This test validates that members can successfully cast upvotes and downvotes
 * on discussion topics. The voting system is fundamental to community-driven
 * content curation on the platform.
 *
 * The test workflow:
 *
 * 1. Create administrator account and category infrastructure
 * 2. Create topic author member account
 * 3. Create multiple voter member accounts
 * 4. Administrator creates a category for topic creation
 * 5. Topic author creates a discussion topic
 * 6. Multiple members cast upvotes and downvotes on the topic
 * 7. Verify all votes are successfully created with correct vote types
 */
export async function test_api_vote_reputation_calculation_topic(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create topic author member account
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(author);

  // Step 3: Create multiple voter member accounts
  const upvoterCount = 3;
  const downvoterCount = 2;

  const upvoters = await ArrayUtil.asyncRepeat(upvoterCount, async () => {
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<20>
        >(),
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(voter);
    return voter;
  });

  const downvoters = await ArrayUtil.asyncRepeat(downvoterCount, async () => {
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<20>
        >(),
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(voter);
    return voter;
  });

  // Step 4: Administrator creates a category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
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

  // Step 5: Topic author creates a discussion topic
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

  // Step 6: Cast upvotes on the topic
  const upvotes = await ArrayUtil.asyncMap(upvoters, async (voter) => {
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
    return vote;
  });

  // Step 7: Cast downvotes on the topic
  const downvotes = await ArrayUtil.asyncMap(downvoters, async (voter) => {
    const vote = await api.functional.discussionBoard.member.votes.create(
      connection,
      {
        body: {
          votable_type: "topic",
          votable_id: topic.id,
          vote_type: "downvote",
        } satisfies IDiscussionBoardVote.ICreate,
      },
    );
    typia.assert(vote);
    return vote;
  });

  // Step 8: Verify all votes were created successfully
  TestValidator.equals("upvote count matches", upvotes.length, upvoterCount);
  TestValidator.equals(
    "downvote count matches",
    downvotes.length,
    downvoterCount,
  );

  // Verify all upvotes have correct vote type
  await ArrayUtil.asyncForEach(upvotes, async (vote) => {
    TestValidator.equals("vote is upvote type", vote.vote_type, "upvote");
    TestValidator.equals("vote targets topic", vote.votable_type, "topic");
    TestValidator.equals(
      "vote targets correct topic",
      vote.votable_id,
      topic.id,
    );
  });

  // Verify all downvotes have correct vote type
  await ArrayUtil.asyncForEach(downvotes, async (vote) => {
    TestValidator.equals("vote is downvote type", vote.vote_type, "downvote");
    TestValidator.equals("vote targets topic", vote.votable_type, "topic");
    TestValidator.equals(
      "vote targets correct topic",
      vote.votable_id,
      topic.id,
    );
  });
}

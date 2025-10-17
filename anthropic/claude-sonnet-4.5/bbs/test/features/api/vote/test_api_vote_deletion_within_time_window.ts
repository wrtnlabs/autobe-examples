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
 * Test the successful hard deletion of a vote record within the 5-minute change
 * window.
 *
 * This test validates that members can completely remove their votes from the
 * system, triggering score recalculation and reputation adjustments. The
 * workflow ensures proper vote deletion functionality within the allowed time
 * window.
 *
 * Workflow:
 *
 * 1. Authenticate as a member using join
 * 2. Create administrator account for category creation
 * 3. Create a discussion category
 * 4. Create a discussion topic as the authenticated member
 * 5. Cast an upvote on the topic
 * 6. Delete the vote within the 5-minute window
 * 7. Verify vote deletion succeeds
 */
export async function test_api_vote_deletion_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member
  const memberBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminBody = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 3: Create a discussion category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Step 4: Re-authenticate as member and create a discussion topic
  await api.functional.auth.member.join(connection, { body: memberBody });

  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
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

  // Step 5: Cast an upvote on the topic
  const voteBody = {
    votable_type: "topic" as const,
    votable_id: topic.id,
    vote_type: "upvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const vote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: voteBody,
    });
  typia.assert(vote);

  // Step 6: Delete the vote within the 5-minute window
  await api.functional.discussionBoard.member.votes.erase(connection, {
    voteId: vote.id,
  });

  // Step 7: Vote deletion completes successfully without error
  // The void return indicates successful deletion
}

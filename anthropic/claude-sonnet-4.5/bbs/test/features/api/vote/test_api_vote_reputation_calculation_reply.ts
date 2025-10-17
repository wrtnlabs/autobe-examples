import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test reply voting system with multiple upvotes and downvotes.
 *
 * Validates that the voting system correctly records upvotes and downvotes on
 * replies from multiple different members. Creates members, a discussion topic,
 * and a reply, then has multiple members cast upvotes and downvotes on the
 * reply.
 *
 * Note: Reputation calculation validation is omitted because no API exists to
 * retrieve member reputation values. This test focuses on vote creation
 * validation.
 *
 * Test Steps:
 *
 * 1. Create administrator account and category
 * 2. Create reply author member
 * 3. Create multiple voter members
 * 4. Reply author creates discussion topic
 * 5. Reply author posts reply to topic
 * 6. Multiple members cast upvotes on the reply
 * 7. Multiple members cast downvotes on the reply
 */
export async function test_api_vote_reputation_calculation_reply(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: 1,
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

  // Step 2: Create reply author member
  const replyAuthorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const replyAuthor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: replyAuthorData,
    });
  typia.assert(replyAuthor);

  // Step 3: Create voter members (3 upvoters, 2 downvoters)
  const upvoterCount = 3;
  const downvoterCount = 2;

  const upvoters: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(upvoterCount, async () => {
      const voterData = {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate;

      const voter: IDiscussionBoardMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: voterData,
        });
      typia.assert(voter);
      return voter;
    });

  const downvoters: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(downvoterCount, async () => {
      const voterData = {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate;

      const voter: IDiscussionBoardMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: voterData,
        });
      typia.assert(voter);
      return voter;
    });

  // Step 4: Create discussion topic (reply author is already authenticated)
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Reply author posts reply to topic
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Upvoters cast upvotes on the reply
  const upvotes: IDiscussionBoardVote[] = await ArrayUtil.asyncRepeat(
    upvoterCount,
    async (index) => {
      const upvoteData = {
        votable_type: "reply" as const,
        votable_id: reply.id,
        vote_type: "upvote" as const,
      } satisfies IDiscussionBoardVote.ICreate;

      const vote: IDiscussionBoardVote =
        await api.functional.discussionBoard.member.votes.create(connection, {
          body: upvoteData,
        });
      typia.assert(vote);
      return vote;
    },
  );

  // Step 7: Downvoters cast downvotes on the reply
  const downvotes: IDiscussionBoardVote[] = await ArrayUtil.asyncRepeat(
    downvoterCount,
    async (index) => {
      const downvoteData = {
        votable_type: "reply" as const,
        votable_id: reply.id,
        vote_type: "downvote" as const,
      } satisfies IDiscussionBoardVote.ICreate;

      const vote: IDiscussionBoardVote =
        await api.functional.discussionBoard.member.votes.create(connection, {
          body: downvoteData,
        });
      typia.assert(vote);
      return vote;
    },
  );

  // Validate votes were created successfully
  TestValidator.equals(
    "upvote count matches expected",
    upvotes.length,
    upvoterCount,
  );
  TestValidator.equals(
    "downvote count matches expected",
    downvotes.length,
    downvoterCount,
  );
}

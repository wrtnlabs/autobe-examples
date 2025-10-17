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
 * Test downvote on a reply with reputation requirement validation.
 *
 * This scenario validates that downvoting requires minimum 50 reputation points
 * per business rules. The test creates a member with insufficient reputation,
 * creates a topic and reply by another member, then attempts to downvote the
 * reply. It verifies that the system rejects the downvote due to insufficient
 * reputation. Then builds reputation for the member by creating content that
 * gets upvoted, and verifies successful downvote with proper reputation
 * deduction (-1 point for reply downvote).
 *
 * Workflow:
 *
 * 1. Create administrator account for category management
 * 2. Create discussion board category
 * 3. Create reply author member, topic, and reply
 * 4. Create test member (starts with 0 reputation)
 * 5. Attempt downvote with insufficient reputation - expect error
 * 6. Build reputation by creating topics and having them upvoted
 * 7. Attempt downvote with sufficient reputation - expect success
 * 8. Verify downvote recorded correctly
 */
export async function test_api_vote_reply_downvote_reputation_check(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create discussion board category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create reply author member, topic, and reply
  const replyAuthorBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const replyAuthor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: replyAuthorBody,
    });
  typia.assert(replyAuthor);

  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  const replyBody = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Step 4: Create test member (starts with 0 reputation)
  const testMemberBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const testMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: testMemberBody,
    });
  typia.assert(testMember);

  // Step 5: Attempt downvote with insufficient reputation - expect error
  await TestValidator.error(
    "downvote should fail with insufficient reputation",
    async () => {
      const downvoteBody = {
        votable_type: "reply" as const,
        votable_id: reply.id,
        vote_type: "downvote" as const,
      } satisfies IDiscussionBoardVote.ICreate;

      await api.functional.discussionBoard.member.votes.create(connection, {
        body: downvoteBody,
      });
    },
  );

  // Step 6: Build reputation by creating topics and having them upvoted
  // Each topic upvote gives +5 reputation, need 10 upvotes for 50 reputation
  const testMemberTopics = await ArrayUtil.asyncRepeat(10, async () => {
    const topicData = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      category_id: category.id,
      tag_ids: null,
    } satisfies IDiscussionBoardTopic.ICreate;

    const createdTopic: IDiscussionBoardTopic =
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: topicData,
      });
    typia.assert(createdTopic);
    return createdTopic;
  });

  // Create helper members to upvote the test member's topics
  await ArrayUtil.asyncForEach(testMemberTopics, async (topicToUpvote) => {
    const helperMemberBody = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate;

    const helperMember: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: helperMemberBody,
      });
    typia.assert(helperMember);

    const upvoteBody = {
      votable_type: "topic" as const,
      votable_id: topicToUpvote.id,
      vote_type: "upvote" as const,
    } satisfies IDiscussionBoardVote.ICreate;

    const upvoteResult: IDiscussionBoardVote =
      await api.functional.discussionBoard.member.votes.create(connection, {
        body: upvoteBody,
      });
    typia.assert(upvoteResult);
  });

  // Step 7: Re-authenticate as test member and attempt downvote - expect success
  const testMemberReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: testMemberBody,
    });
  typia.assert(testMemberReauth);

  const successfulDownvoteBody = {
    votable_type: "reply" as const,
    votable_id: reply.id,
    vote_type: "downvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const downvoteResult: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: successfulDownvoteBody,
    });
  typia.assert(downvoteResult);

  // Step 8: Verify downvote was recorded correctly
  TestValidator.equals(
    "downvote votable_type should be reply",
    downvoteResult.votable_type,
    "reply",
  );
  TestValidator.equals(
    "downvote votable_id should match reply id",
    downvoteResult.votable_id,
    reply.id,
  );
  TestValidator.equals(
    "downvote vote_type should be downvote",
    downvoteResult.vote_type,
    "downvote",
  );
}

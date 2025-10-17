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
 * Test that deleting a downvote on a reply correctly removes the vote from the
 * system within the 5-minute change window.
 *
 * This test validates the voting system's vote deletion workflow. When a member
 * casts a downvote on a reply, they can delete that vote within the 5-minute
 * change window. This test ensures the deletion operation succeeds and the vote
 * is properly removed from the system.
 *
 * Note: While the business requirements specify that vote deletion should also
 * recalculate reply scores and author reputation, the available API endpoints
 * do not provide a way to fetch and verify these values. Therefore, this test
 * focuses on validating the vote creation and deletion workflow itself.
 *
 * Workflow:
 *
 * 1. Create voter member account for casting and deleting votes
 * 2. Create author member account who will create content
 * 3. Create administrator account for category creation privileges
 * 4. Administrator creates a discussion category
 * 5. Switch to author authentication
 * 6. Author creates a discussion topic to host replies
 * 7. Author creates a reply on the topic (votable content)
 * 8. Switch to voter authentication
 * 9. Voter casts a downvote on the reply
 * 10. Voter deletes the downvote within 5-minute window
 * 11. Verify vote deletion succeeded without error
 *
 * Validations:
 *
 * - Vote creation completes successfully
 * - Vote deletion completes without error within the 5-minute window
 * - All authentication context switches work correctly
 * - Proper workflow from content creation through voting to deletion
 */
export async function test_api_vote_deletion_reputation_recalculation(
  connection: api.IConnection,
) {
  // 1. Create voter member account
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = "VoterPass123!";
  const voterUsername = RandomGenerator.alphaNumeric(8);

  const voter = await api.functional.auth.member.join(connection, {
    body: {
      username: voterUsername,
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(voter);

  // 2. Create author member account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = "AuthorPass123!";
  const authorUsername = RandomGenerator.alphaNumeric(8);

  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: authorPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(author);

  // 3. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminUsername = RandomGenerator.alphaNumeric(8);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Administrator creates discussion category
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Switch to author authentication and create topic
  const authorAuthorized = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: authorPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(authorAuthorized);

  // 6. Author creates discussion topic
  const topicTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 15,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
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

  // 7. Author creates reply on the topic
  const replyContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: replyContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // 8. Switch to voter authentication
  const voterAuthorized = await api.functional.auth.member.join(connection, {
    body: {
      username: voterUsername,
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(voterAuthorized);

  // 9. Voter casts downvote on the reply
  const vote = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "reply",
        votable_id: reply.id,
        vote_type: "downvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);

  // 10. Voter deletes the downvote within 5-minute window
  await api.functional.discussionBoard.member.votes.erase(connection, {
    voteId: vote.id,
  });

  // 11. Validation complete - vote deletion succeeded without error
  // The successful completion of erase() without throwing an error confirms
  // that the vote was properly deleted within the 5-minute change window
}

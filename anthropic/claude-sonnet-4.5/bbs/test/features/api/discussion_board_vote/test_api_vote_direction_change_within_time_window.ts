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
 * Test successful vote direction change from upvote to downvote within the
 * 5-minute modification window.
 *
 * This test validates the core vote modification functionality where a member
 * can reconsider their content assessment shortly after voting. The workflow
 * creates the necessary prerequisites (admin account, category, member account,
 * topic), casts an initial upvote, then immediately updates it to a downvote
 * while still within the 5-minute change window.
 *
 * Workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create discussion category for topic organization
 * 3. Create member account and authenticate
 * 4. Create discussion topic as votable content
 * 5. Cast initial upvote on the topic
 * 6. Update vote to downvote within 5-minute window
 * 7. Verify vote direction changed successfully
 * 8. Verify updated timestamp reflects the modification
 */
export async function test_api_vote_direction_change_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@Pass123";
  const adminUsername = RandomGenerator.alphaNumeric(10);

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for organizing topics
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member@Pass123";
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create discussion topic
  const topicTitle = RandomGenerator.paragraph({ sentences: 3 });
  const topicBody = RandomGenerator.content({ paragraphs: 2 });

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: topicTitle,
        body: topicBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 5: Cast initial upvote on the topic
  const initialVote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: {
        votable_type: "topic",
        votable_id: topic.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    });
  typia.assert(initialVote);

  // Verify initial vote properties
  TestValidator.equals("initial vote type", initialVote.vote_type, "upvote");
  TestValidator.equals(
    "initial votable type",
    initialVote.votable_type,
    "topic",
  );
  TestValidator.equals("initial votable id", initialVote.votable_id, topic.id);

  // Step 6: Update vote to downvote within 5-minute window
  const updatedVote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "downvote",
      } satisfies IDiscussionBoardVote.IUpdate,
    });
  typia.assert(updatedVote);

  // Step 7: Verify vote direction changed successfully
  TestValidator.equals(
    "updated vote id matches",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "votable type unchanged",
    updatedVote.votable_type,
    "topic",
  );
  TestValidator.equals(
    "votable id unchanged",
    updatedVote.votable_id,
    topic.id,
  );

  // Step 8: Verify updated timestamp reflects modification
  TestValidator.equals(
    "created timestamp unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.predicate(
    "updated timestamp is set and differs from created timestamp",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(initialVote.created_at).getTime(),
  );
}

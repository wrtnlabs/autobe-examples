import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTagStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTagStatistics";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test tag statistics reflect actual platform activity including topics, votes,
 * and followers.
 *
 * This scenario validates that the materialized view statistics accurately
 * represent tag usage across the platform. The test creates a tag, creates
 * topics tagged with that tag, casts votes on those topics, and has users
 * follow the tag. Then retrieves the tag statistics and verifies that
 * usage_count reflects the number of tagged topics, total_votes matches the
 * vote activity, and follower_count shows users following the tag.
 *
 * Workflow:
 *
 * 1. Create administrator account for tag and category creation
 * 2. Create member account for creating topics and following tags
 * 3. Administrator creates a tag to be tracked
 * 4. Administrator creates category required for topic creation
 * 5. Member creates multiple topics tagged with the test tag
 * 6. Create second member account for voting (avoid self-voting)
 * 7. Second member casts votes on tagged topics
 * 8. First member follows the tag
 * 9. Retrieve tag statistics and validate all metrics
 */
export async function test_api_tag_statistics_with_activity(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Switch back to administrator for resource creation
  await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });

  // 3. Administrator creates a tag
  const tagName = RandomGenerator.name(1);
  const tagDescription = RandomGenerator.paragraph({ sentences: 2 });

  const tagBody = {
    name: tagName,
    description: tagDescription,
  } satisfies IDiscussionBoardTag.ICreate;

  const tag = await api.functional.discussionBoard.administrator.tags.create(
    connection,
    {
      body: tagBody,
    },
  );
  typia.assert(tag);

  // 4. Administrator creates category
  const categoryName = RandomGenerator.name(2);
  const categorySlug = typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>();

  const categoryBody = {
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Switch back to member account for topic creation
  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  // 5. Create multiple topics tagged with the test tag
  const topicCount = 3;
  const createdTopics: IDiscussionBoardTopic[] = [];

  for (let i = 0; i < topicCount; i++) {
    const topicTitle = RandomGenerator.paragraph({ sentences: 2 });
    const topicBody = RandomGenerator.content({ paragraphs: 2 });

    const topicData = {
      title: topicTitle,
      body: topicBody,
      category_id: category.id,
      tag_ids: [tag.id],
    } satisfies IDiscussionBoardTopic.ICreate;

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: topicData,
      },
    );
    typia.assert(topic);
    createdTopics.push(topic);
  }

  // 6. Create second member account for voting
  const voter2Email = typia.random<string & tags.Format<"email">>();
  const voter2Password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const voter2Username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const voter2Body = {
    username: voter2Username,
    email: voter2Email,
    password: voter2Password,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const voter2 = await api.functional.auth.member.join(connection, {
    body: voter2Body,
  });
  typia.assert(voter2);

  // 7. Second member casts votes on tagged topics
  let totalVotes = 0;

  for (let i = 0; i < topicCount; i++) {
    const topic = createdTopics[i];

    const upvoteBody = {
      votable_type: "topic" as const,
      votable_id: topic.id,
      vote_type: "upvote" as const,
    } satisfies IDiscussionBoardVote.ICreate;

    const upvote = await api.functional.discussionBoard.member.votes.create(
      connection,
      {
        body: upvoteBody,
      },
    );
    typia.assert(upvote);
    totalVotes++;

    const downvoteBody = {
      votable_type: "topic" as const,
      votable_id: topic.id,
      vote_type: "downvote" as const,
    } satisfies IDiscussionBoardVote.ICreate;

    const downvote = await api.functional.discussionBoard.member.votes.create(
      connection,
      {
        body: downvoteBody,
      },
    );
    typia.assert(downvote);
    totalVotes++;
  }

  // 8. First member follows the tag
  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  const followTagBody = {
    discussion_board_tag_id: tag.id,
  } satisfies IDiscussionBoardFollowedTag.ICreate;

  const followedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: member.id,
        body: followTagBody,
      },
    );
  typia.assert(followedTag);

  // 9. Retrieve tag statistics and validate metrics
  const statistics = await api.functional.discussionBoard.tags.statistics.at(
    connection,
    {
      tagId: tag.id,
    },
  );
  typia.assert(statistics);

  // Validate usage_count reflects number of tagged topics
  TestValidator.equals(
    "usage_count should match number of topics tagged",
    statistics.usage_count,
    topicCount,
  );

  // Validate total_votes matches vote activity
  TestValidator.equals(
    "total_votes should match total votes cast",
    statistics.total_votes,
    totalVotes,
  );

  // Validate follower_count shows users following the tag
  TestValidator.equals(
    "follower_count should be 1",
    statistics.follower_count,
    1,
  );

  // Validate tag reference is correct
  TestValidator.equals(
    "statistics should reference correct tag",
    statistics.discussion_board_tag_id,
    tag.id,
  );
}

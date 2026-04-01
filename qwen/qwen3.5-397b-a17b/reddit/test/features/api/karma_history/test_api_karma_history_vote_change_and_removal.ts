import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserKarmaHistory";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test karma history tracking when votes are changed or removed.
 *
 * This test validates the complete karma history audit trail for vote operations:
 * 1. Content creator registers and creates a community
 * 2. Content creator subscribes to the community and creates a post
 * 3. Voter registers and subscribes to the community
 * 4. Voter upvotes the post (karma history: +1)
 * 5. Voter changes vote to downvote (karma history: -2)
 * 6. Voter removes vote entirely (karma history: +1)
 * 7. Validate all karma history records show correct change_amount values
 * 8. Verify chronological order and cumulative new_total scores
 */
export async function test_api_karma_history_vote_change_and_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create content creator account
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(creatorAuth);
  // 2. Create community
  const community =
    await api.functional.redditCommunity.member.communities.create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Creator subscribes to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    creatorConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create voter account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 6. Voter subscribes to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    voterConnection,
    {
      communityName: community.name,
    },
  );
  // 7. Voter upvotes the post (initial upvote: +1 karma)
  const upvote = await api.functional.redditCommunity.member.posts.vote.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  // 8. Voter changes vote from upvote to downvote (change: -2 karma)
  const downvote =
    await api.functional.redditCommunity.member.posts.vote.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote direction", downvote.direction, "DOWNVOTE");
  // 9. Voter removes vote entirely (removal: +1 karma)
  await api.functional.redditCommunity.member.posts.vote.erase(
    voterConnection,
    {
      postId: post.id,
    },
  );
  // 10. Creator retrieves karma history
  const karmaHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_asc",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistory);
  // 11. Validate karma history records
  TestValidator.predicate(
    "has karma history records",
    karmaHistory.data.length >= 3,
  );
  // Sort by created_at to ensure chronological order
  const sortedRecords = karmaHistory.data.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // First record: initial upvote (+1)
  const firstRecord = sortedRecords[0];
  TestValidator.equals(
    "first record change_amount (upvote)",
    firstRecord.change_amount,
    1,
  );
  TestValidator.equals(
    "first record source_type",
    firstRecord.source_type,
    "POST",
  );
  TestValidator.equals(
    "first record source_id",
    firstRecord.source_id,
    post.id,
  );
  TestValidator.notEquals("first record has voter", firstRecord.voter, null);
  if (firstRecord.voter !== null) {
    TestValidator.equals(
      "first record voter is voter",
      firstRecord.voter.id,
      voterAuth.id,
    );
  }
  // Second record: change from upvote to downvote (-2)
  const secondRecord = sortedRecords[1];
  TestValidator.equals(
    "second record change_amount (vote change)",
    secondRecord.change_amount,
    -2,
  );
  TestValidator.equals(
    "second record source_type",
    secondRecord.source_type,
    "POST",
  );
  TestValidator.equals(
    "second record source_id",
    secondRecord.source_id,
    post.id,
  );
  // Third record: vote removal (+1)
  const thirdRecord = sortedRecords[2];
  TestValidator.equals(
    "third record change_amount (vote removal)",
    thirdRecord.change_amount,
    1,
  );
  TestValidator.equals(
    "third record source_type",
    thirdRecord.source_type,
    "POST",
  );
  TestValidator.equals(
    "third record source_id",
    thirdRecord.source_id,
    post.id,
  );
  // Validate chronological order
  TestValidator.predicate("records in chronological order", () => {
    return (
      new Date(firstRecord.created_at).getTime() <=
        new Date(secondRecord.created_at).getTime() &&
      new Date(secondRecord.created_at).getTime() <=
        new Date(thirdRecord.created_at).getTime()
    );
  });
  // Validate cumulative karma totals
  TestValidator.predicate("karma totals are cumulative", () => {
    // new_total should reflect cumulative changes
    const expectedTotalAfterUpvote = firstRecord.new_total;
    const expectedTotalAfterDownvote = expectedTotalAfterUpvote - 2;
    const expectedTotalAfterRemoval = expectedTotalAfterDownvote + 1;
    return (
      secondRecord.new_total === expectedTotalAfterDownvote &&
      thirdRecord.new_total === expectedTotalAfterRemoval
    );
  });
}

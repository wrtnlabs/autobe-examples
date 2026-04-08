import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_post_statistics_retrieve_with_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to create community and post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpass123",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers;
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.redditPlatform.member.communities.subscribe(
    communityConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create a post in the community
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve post statistics
  const statisticsConnection: api.IConnection = { host: connection.host };
  statisticsConnection.headers = memberConnection.headers;
  const statistics =
    await api.functional.redditPlatform.member.posts.statistics(
      statisticsConnection,
      { postId: post.id },
    );
  typia.assert(statistics);
  // 6. Validate statistics response
  TestValidator.equals("post id matches", statistics.id, post.id);
  TestValidator.equals(
    "author username matches",
    statistics.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "author id matches",
    statistics.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community name matches",
    statistics.community.name,
    community.name,
  );
  TestValidator.equals(
    "community id matches",
    statistics.community.id,
    community.id,
  );
  // Validate vote metrics (should be 0 for new post)
  TestValidator.equals(
    "total votes is sum of upvotes and downvotes",
    statistics.total_votes,
    statistics.upvotes_count + statistics.downvotes_count,
  );
  TestValidator.equals("total votes is 0", statistics.total_votes, 0);
  TestValidator.equals("upvotes is 0", statistics.upvotes_count, 0);
  TestValidator.equals("downvotes is 0", statistics.downvotes_count, 0);
  TestValidator.equals(
    "vote ratio is 0 when no votes",
    statistics.vote_ratio,
    0,
  );
  TestValidator.equals("unique voters is 0", statistics.unique_voters_count, 0);
  // Validate comment metrics (should be 0 for new post)
  TestValidator.equals("comment count is 0", statistics.comment_count, 0);
  TestValidator.equals(
    "root comment count is 0",
    statistics.root_comment_count,
    0,
  );
  TestValidator.equals(
    "reply comment count is 0",
    statistics.reply_comment_count,
    0,
  );
  TestValidator.equals("top comment is null", statistics.top_comment_id, null);
  TestValidator.equals(
    "votes per comment ratio is 0",
    statistics.votes_per_comment_ratio,
    0,
  );
  TestValidator.equals("comment density is 0", statistics.comment_density, 0);
  TestValidator.equals(
    "engagement velocity is 0",
    statistics.engagement_velocity,
    0,
  );
  // Validate recent activity metrics
  TestValidator.equals(
    "24h comment count is 0",
    statistics.recent_activity_24h.comment_count,
    0,
  );
  TestValidator.equals(
    "24h vote count is 0",
    statistics.recent_activity_24h.vote_count,
    0,
  );
  TestValidator.equals(
    "24h unique voters is 0",
    statistics.recent_activity_24h.unique_voters_count,
    0,
  );
  TestValidator.equals(
    "7d comment count is 0",
    statistics.recent_activity_7d.comment_count,
    0,
  );
  TestValidator.equals(
    "7d vote count is 0",
    statistics.recent_activity_7d.vote_count,
    0,
  );
  TestValidator.equals(
    "7d unique voters is 0",
    statistics.recent_activity_7d.unique_voters_count,
    0,
  );
  // Validate timestamp format (ISO 8601)
  typia.assert(statistics.created_at);
  typia.assert(statistics.updated_at);
  // Ensure timestamps are valid dates
  const createdDate = new Date(statistics.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !Number.isNaN(createdDate.getTime()),
  );
  const updatedDate = new Date(statistics.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !Number.isNaN(updatedDate.getTime()),
  );
}
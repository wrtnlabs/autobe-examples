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

export async function test_api_post_statistics_retrieve_no_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  const memberUsername = memberAuth.username;
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  const communityName = community.name;
  // 3. Subscribe to community
  const subscribeConnection: api.IConnection = { host: connection.host };
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      subscribeConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription);
  // 4. Create post with no votes or comments
  const postConnection: api.IConnection = { host: connection.host };
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const postId = post.id;
  // 5. Retrieve and validate statistics
  const statsConnection: api.IConnection = { host: connection.host };
  const statistics =
    await api.functional.redditPlatform.member.posts.statistics(
      statsConnection,
      {
        postId,
      },
    );
  typia.assert(statistics);
  // Verify engagement metrics are zero
  TestValidator.equals("upvotes count is zero", statistics.upvotes_count, 0);
  TestValidator.equals(
    "downvotes count is zero",
    statistics.downvotes_count,
    0,
  );
  TestValidator.equals("total votes is zero", statistics.total_votes, 0);
  TestValidator.equals(
    "vote ratio is zero (no votes)",
    statistics.vote_ratio,
    0,
  );
  TestValidator.equals(
    "unique voters count is zero",
    statistics.unique_voters_count,
    0,
  );
  TestValidator.equals("comment count is zero", statistics.comment_count, 0);
  TestValidator.equals(
    "root comment count is zero",
    statistics.root_comment_count,
    0,
  );
  TestValidator.equals(
    "reply comment count is zero",
    statistics.reply_comment_count,
    0,
  );
  TestValidator.equals(
    "top comment id is null (no comments)",
    statistics.top_comment_id,
    null,
  );
  TestValidator.equals(
    "votes per comment ratio is zero",
    statistics.votes_per_comment_ratio,
    0,
  );
  TestValidator.equals(
    "comment density is zero",
    statistics.comment_density,
    0,
  );
  TestValidator.equals(
    "engagement velocity is zero",
    statistics.engagement_velocity,
    0,
  );
  // Verify recent activity 24h is zero
  TestValidator.equals(
    "recent activity 24h comment count is zero",
    statistics.recent_activity_24h.comment_count,
    0,
  );
  TestValidator.equals(
    "recent activity 24h vote count is zero",
    statistics.recent_activity_24h.vote_count,
    0,
  );
  TestValidator.equals(
    "recent activity 24h unique voters is zero",
    statistics.recent_activity_24h.unique_voters_count,
    0,
  );
  // Verify recent activity 7d is zero
  TestValidator.equals(
    "recent activity 7d comment count is zero",
    statistics.recent_activity_7d.comment_count,
    0,
  );
  TestValidator.equals(
    "recent activity 7d vote count is zero",
    statistics.recent_activity_7d.vote_count,
    0,
  );
  TestValidator.equals(
    "recent activity 7d unique voters is zero",
    statistics.recent_activity_7d.unique_voters_count,
    0,
  );
  // Verify metadata fields are populated
  TestValidator.notEquals("post id is valid", statistics.id, null);
  TestValidator.equals(
    "author id matches created member",
    statistics.author.id,
    memberId,
  );
  TestValidator.equals(
    "author username matches",
    statistics.author.username,
    memberUsername,
  );
  TestValidator.notEquals(
    "community id is valid",
    statistics.community.id,
    null,
  );
  TestValidator.equals(
    "community name matches",
    statistics.community.name,
    communityName,
  );
}

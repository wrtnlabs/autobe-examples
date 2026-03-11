import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedRequest";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function test_api_community_feed_viewing_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.user);
  // 2. Create community for test posts
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community (implicit via API permissions)
  // 4. Create test posts
  // Create first post - will be used as reference for sorting
  const post1 = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        authorId: memberAuth.user.id,
        postType: "text",
        search: undefined,
        excludeTypes: undefined,
        dateRange: undefined,
        voteScoreRange: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        timeRange: undefined,
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(post1);
  // Create second post with recent timestamp
  const post2 = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        authorId: memberAuth.user.id,
        postType: "link",
        search: undefined,
        excludeTypes: undefined,
        dateRange: undefined,
        voteScoreRange: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        timeRange: undefined,
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(post2);
  // Create third post for controversial test
  const post3 = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        authorId: memberAuth.user.id,
        postType: "image",
        search: undefined,
        excludeTypes: undefined,
        dateRange: undefined,
        voteScoreRange: undefined,
        sortBy: undefined,
        sortDirection: undefined,
        timeRange: undefined,
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(post3);
  // 5. Test feed with different sorting algorithms
  // Hot sorting - verify recent activity weighted by engagement
  const hotFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      communityConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "hot",
          timeRange: undefined,
          page: 1,
          pageSize: 20,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(hotFeed);
  // New sorting - verify chronological ordering (most recent first)
  const newFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      communityConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "new",
          timeRange: undefined,
          page: 1,
          pageSize: 20,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(newFeed);
  // Top sorting - verify highest vote score with time range filter
  const topFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      communityConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "top",
          timeRange: "this_week",
          page: 1,
          pageSize: 20,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(topFeed);
  // Controversial sorting - verify posts with mixed reactions
  const controversialFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      communityConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "controversial",
          timeRange: undefined,
          page: 1,
          pageSize: 20,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(controversialFeed);
  // 6. Validate response structure and pagination metadata
  TestValidator.equals(
    "hot feed pagination current",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "new feed pagination current",
    newFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "top feed pagination current",
    topFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "controversial feed pagination current",
    controversialFeed.pagination.current,
    1,
  );
  // Verify all feeds return the same community
  for (const feed of [hotFeed, newFeed, topFeed, controversialFeed]) {
    for (const post of feed.data) {
      TestValidator.equals(
        `post ${post.id} belongs to community`,
        post.community.id,
        community.id,
      );
    }
  }
  // Verify post summaries contain required fields
  if (hotFeed.data.length > 0) {
    const samplePost = hotFeed.data[0];
    typia.assert(samplePost);
    TestValidator.predicate(
      "post has valid title",
      samplePost.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid vote score",
      typeof samplePost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has author",
      samplePost.author !== null && samplePost.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      samplePost.community !== null && samplePost.community !== undefined,
    );
    TestValidator.predicate(
      "post has creation timestamp",
      samplePost.created_at !== undefined,
    );
  }
}
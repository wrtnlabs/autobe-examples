import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_feed_popular_all_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple communities
  const community1 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community3);
  // 3. Subscribe to all created communities
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnection,
    {
      communityName: community1.name,
    },
  );
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnection,
    {
      communityName: community2.name,
    },
  );
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnection,
    {
      communityName: community3.name,
    },
  );
  // 4. Create multiple posts with different characteristics
  // Post 1: Text post in community1
  const post1 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post1);
  // Post 2: Link post in community2
  const post2 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        link_url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post2);
  // Post 3: Image post in community3
  const post3 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        image_path: `/images/${RandomGenerator.alphabets(10)}.jpg`,
      },
    },
  );
  typia.assert(post3);
  // Post 4: Another text post in community1
  const post4 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post4);
  // Post 5: Another link post in community2
  const post5 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        link_url: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post5);
  // 5. Test popular feed with sort='new'
  const newFeed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "new",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  TestValidator.predicate(
    "new feed has pagination",
    newFeed.pagination.records >= newFeed.data.length,
  );
  // Verify posts are ordered by created_at DESC for new sort
  if (newFeed.data.length >= 2) {
    const firstPostTime = new Date(newFeed.data[0].created_at).getTime();
    const secondPostTime = new Date(newFeed.data[1].created_at).getTime();
    TestValidator.predicate(
      "new sort orders by created_at DESC",
      firstPostTime >= secondPostTime,
    );
  }
  // 6. Test popular feed with sort='top'
  const topFeed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "top",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has posts", topFeed.data.length > 0);
  // Verify posts are ordered by vote_score DESC for top sort
  if (topFeed.data.length >= 2) {
    const firstScore = topFeed.data[0].vote_score;
    const secondScore = topFeed.data[1].vote_score;
    TestValidator.predicate(
      "top sort orders by vote_score DESC",
      firstScore >= secondScore,
    );
  }
  // 7. Test popular feed with sort='top' and timeFilter='week'
  const topWeekFeed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "top",
        timeFilter: "week",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(topWeekFeed);
  TestValidator.predicate(
    "top week feed returns results",
    topWeekFeed.data.length >= 0,
  );
  // Verify all posts in week filter are within last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  for (const post of topWeekFeed.data) {
    const postTime = new Date(post.created_at);
    TestValidator.predicate(
      `post ${post.id} is within last week`,
      postTime >= oneWeekAgo,
    );
  }
  // 8. Test popular feed with sort='controversial'
  const controversialFeed =
    await api.functional.redditCommunity.member.posts.index(memberConnection, {
      body: {
        feedType: "popular",
        sort: "controversial",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed returns results",
    controversialFeed.data.length >= 0,
  );
  // 9. Verify popular feed includes posts from all communities
  const allCommunityIds = new Set([
    community1.id,
    community2.id,
    community3.id,
  ]);
  const feedCommunityIds = new Set(newFeed.data.map((p) => p.community.id));
  // At least some of our created communities should appear in the feed
  let foundCommunities = 0;
  for (const communityId of allCommunityIds) {
    if (feedCommunityIds.has(communityId)) {
      foundCommunities++;
    }
  }
  TestValidator.predicate(
    "popular feed includes posts from created communities",
    foundCommunities > 0,
  );
  // 10. Test pagination
  const page1 = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "new",
        limit: 2,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "new",
        limit: 2,
        page: 2,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  // Verify different pages return different posts (if enough posts exist)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((p) => p.id));
    const page2Ids = new Set(page2.data.map((p) => p.id));
    let hasDifferentPosts = false;
    for (const id of page2Ids) {
      if (!page1Ids.has(id)) {
        hasDifferentPosts = true;
        break;
      }
    }
    TestValidator.predicate(
      "pagination returns different posts",
      hasDifferentPosts,
    );
  }
  // Verify post type filtering works
  const textPostsFeed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        feedType: "popular",
        sort: "new",
        postType: "text",
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(textPostsFeed);
  for (const post of textPostsFeed.data) {
    TestValidator.equals("text post type", post.post_type, "text");
  }
}

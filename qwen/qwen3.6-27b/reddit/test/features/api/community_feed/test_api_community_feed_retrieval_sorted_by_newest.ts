import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Validates community feed retrieval with newest-first sorting.
 *
 * Tests the complete workflow of member registration, community creation,
 * subscription, post publishing, and feed retrieval with sort_by='new'
 * parameter. Ensures that the feed endpoint returns paginated results with
 * correct metadata and posts sorted in descending order by created_at timestamp.
 *
 * 1. Registers a new member with unique credentials.
 * 2. Creates a community with name and description.
 * 3. Subscribes the member to the community.
 * 4. Creates one to five posts in the community.
 * 5. Retrieves the community feed with newest-first sorting.
 * 6. Validates pagination metadata (current page, limit, total records, total pages).
 * 7. Validates that returned posts are sorted by created_at in descending order.
 * 8. Validates that posts belonging to the created community reference it correctly.
 */
export async function test_api_community_feed_retrieval_sorted_by_newest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create 1-5 posts in the community
  const postCount: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const posts = await ArrayUtil.asyncRepeat(
    postCount,
    async (_i: number): Promise<IREdditLikeCommunityPost> => {
      const post =
        await generate_random_reddit_like_community_member_posts_create(
          memberConnection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 2 }),
              post_type: "text",
              community_id: community.id,
              body: RandomGenerator.paragraph({ sentences: 5 }),
            } satisfies IREdditLikeCommunityPost.ICreate,
          },
        );
      typia.assert(post);
      return post;
    },
  );
  // 5. Retrieve feed sorted by newest
  const feed = await api.functional.redditLikeCommunity.communities.feeds.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort_by: "new",
      } satisfies IREdditLikeCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.predicate(
    "total records positive",
    feed.pagination.records > 0,
  );
  TestValidator.predicate("total pages positive", feed.pagination.pages > 0);
  TestValidator.predicate("limit positive", feed.pagination.limit > 0);
  // 7. Validate feed data contains entries
  TestValidator.predicate("feed data not empty", feed.data.length > 0);
  // 8. Validate posts are sorted by created_at descending (newest first)
  for (let i = 1; i < feed.data.length; i++) {
    const prevTimestamp = new Date(feed.data[i - 1].created_at).getTime();
    const currTimestamp = new Date(feed.data[i].created_at).getTime();
    TestValidator.predicate(
      `posts at index ${i - 1} and ${i} sorted descending by created_at`,
      prevTimestamp >= currTimestamp,
    );
  }
  // 9. Validate posts from created community reference the correct community
  const createdPostIds: Set<string> = new Set(posts.map((p) => p.id));
  for (const postSummary of feed.data) {
    if (createdPostIds.has(postSummary.id)) {
      TestValidator.equals(
        `post ${postSummary.id} community_id matches created community`,
        postSummary.community.id,
        community.id,
      );
    }
  }
}

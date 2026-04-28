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
 * Test guest access to the popular feed with post summaries.
 *
 * Validates that unauthenticated users can retrieve a paginated list of post summaries from the popular feed endpoint. Verifies pagination metadata structure and that post summaries include complete nested author and community information.
 *
 * Setup creates test resources: a member account, a community, a subscription, and multiple posts to populate the feed.
 *
 * 1. Member authenticates and creates a community.
 * 2. Member subscribes to their community.
 * 3. Member creates multiple posts in the community.
 * 4. Guest (unauthenticated) requests popular feed without credentials.
 * 5. Verifies pagination metadata (current, limit, records, pages) is valid.
 * 6. Validates post summaries contain all required fields including nested author and community summaries.
 */
export async function test_api_popular_feed_guest_access_with_post_summaries(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe member to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // Create posts in the community
  const createPostsConnection: api.IConnection = { host: connection.host };
  const postTypes = ["text", "link", "image"] as const;
  const postCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const createdPosts: IREdditLikeCommunityPost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post =
      await generate_random_reddit_like_community_member_posts_create(
        createPostsConnection,
        {
          body: {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: RandomGenerator.pick(postTypes),
            body: RandomGenerator.content({ paragraphs: 1 }),
          },
        },
      );
    typia.assert(post);
    createdPosts.push(post);
  }
  // Guest access: Create fresh connection without authentication headers
  const guestConnection: api.IConnection = { host: connection.host };
  // Request popular feed as guest with empty request body
  const feed = await api.functional.redditLikeCommunity.feeds.popular.index(
    guestConnection,
    {
      body: {} satisfies IREdditLikeCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    feed.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    feed.pagination.records === feed.data.length,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    feed.pagination.pages >= 1,
  );
  // Validate post summaries in feed
  TestValidator.equals(
    "feed contains created posts",
    feed.data.length,
    createdPosts.length,
  );
  // Validate structure of first post summary
  if (feed.data.length > 0) {
    const firstPost = feed.data[0];
    // Verify post summary fields
    TestValidator.predicate("post has valid id", firstPost.id.length > 0);
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has post_type",
      firstPost.post_type.length > 0,
    );
    TestValidator.predicate(
      "post has created_at",
      firstPost.created_at.length > 0,
    );
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(firstPost.vote_score),
    );
    TestValidator.predicate(
      "comment_count is integer",
      Number.isInteger(firstPost.comment_count),
    );
    // Verify nested author summary
    TestValidator.predicate("author has id", firstPost.author.id.length > 0);
    TestValidator.predicate(
      "author has username",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has email",
      firstPost.author.email.length > 0,
    );
    TestValidator.predicate(
      "author has created_at",
      firstPost.author.created_at.length > 0,
    );
    // Verify nested community summary
    TestValidator.predicate(
      "community has id",
      firstPost.community.id.length > 0,
    );
    TestValidator.predicate(
      "community has name",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      firstPost.community.description.length > 0,
    );
    TestValidator.predicate(
      "community has created_at",
      firstPost.community.created_at.length > 0,
    );
    TestValidator.equals(
      "community id matches created community",
      firstPost.community.id,
      community.id,
    );
    TestValidator.equals(
      "community name matches created community",
      firstPost.community.name,
      community.name,
    );
  }
}

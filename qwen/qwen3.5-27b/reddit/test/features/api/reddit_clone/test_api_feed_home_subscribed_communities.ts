import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that authenticated member viewing home feed receives posts only from communities they are subscribed to.
 *
 * 1. Register and authenticate a member
 * 2. Create two communities as the member
 * 3. Create posts in both communities
 * 4. Call home feed endpoint and verify posts are from subscribed communities
 * 5. Validate pagination and post summary structure
 */
export async function test_api_feed_home_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first community
  const community1 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  // 3. Create second community
  const community2 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // 4. Create post in first community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community1.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post1);
  // 5. Create post in second community
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community2.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post2);
  // 6. Call home feed endpoint
  const feed = await api.functional.redditClone.member.feed.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        page: 1,
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 7. Validate pagination metadata
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 20);
  TestValidator.predicate("has records", feed.pagination.records >= 2);
  TestValidator.predicate("has pages", feed.pagination.pages >= 1);
  // 8. Validate posts are from subscribed communities
  TestValidator.predicate("feed contains posts", feed.data.length >= 2);
  // Extract community IDs from feed posts
  const feedCommunityIds = feed.data.map((post) => post.community.id);
  // Verify both created communities' posts appear in feed
  TestValidator.predicate(
    "feed contains post from first community",
    feedCommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "feed contains post from second community",
    feedCommunityIds.includes(community2.id),
  );
  // 9. Validate post summary structure
  if (feed.data.length > 0) {
    const samplePost = feed.data[0];
    // Verify required fields exist
    TestValidator.predicate("post has id", samplePost.id !== undefined);
    TestValidator.predicate("post has title", samplePost.title !== undefined);
    TestValidator.predicate(
      "post has post_type",
      samplePost.post_type !== undefined,
    );
    TestValidator.predicate("post has score", samplePost.score !== undefined);
    TestValidator.predicate(
      "post has comment_count",
      samplePost.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      samplePost.created_at !== undefined,
    );
    TestValidator.predicate("post has author", samplePost.author !== undefined);
    TestValidator.predicate(
      "post has community",
      samplePost.community !== undefined,
    );
    // Verify author structure
    TestValidator.predicate(
      "author has username",
      samplePost.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      samplePost.author.display_name !== undefined,
    );
    // Verify community structure
    TestValidator.predicate(
      "community has name",
      samplePost.community.name !== undefined,
    );
  }
  // 10. Verify all posts belong to member's subscribed communities
  const memberCommunityIds = [community1.id, community2.id];
  for (const post of feed.data) {
    TestValidator.predicate(
      `post ${post.id} belongs to subscribed community`,
      memberCommunityIds.includes(post.community.id),
    );
  }
}

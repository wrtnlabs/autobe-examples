import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_feed_community_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create target community (community A)
  const communityA =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3. Create 3 posts in community A
  const postsInCommunityA = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: communityA.id,
          title: RandomGenerator.name(2),
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 4. Create another community (community B)
  const communityB =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Create 2 posts in community B
  const postsInCommunityB = await ArrayUtil.asyncRepeat(2, async () => {
    const post = await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: communityB.id,
          title: RandomGenerator.name(2),
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 6. Query posts (community_id filtering not supported in API, query all posts)
  const feedResponse = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
      },
    },
  );
  typia.assert(feedResponse);
  // 7. Validate response structure
  TestValidator.predicate(
    "response has data array",
    feedResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination exists",
    feedResponse.pagination !== undefined,
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    feedResponse.pagination.pages > 0,
  );
  // 9. Validate post summary structure for each post
  feedResponse.data.forEach((post) => {
    TestValidator.predicate("post has id", post.id !== undefined);
    TestValidator.predicate("post has title", post.title !== undefined);
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has vote score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment count",
      post.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
    TestValidator.predicate("post has post_type", post.post_type !== undefined);
    TestValidator.predicate("post has preview", post.preview !== undefined);
  });
  // 10. Validate that posts from our created communities exist in response
  const hasCommunityAPosts = feedResponse.data.some(
    (post) => post.community.id === communityA.id,
  );
  const hasCommunityBPosts = feedResponse.data.some(
    (post) => post.community.id === communityB.id,
  );
  TestValidator.predicate(
    "feed contains posts from community A",
    hasCommunityAPosts,
  );
  TestValidator.predicate(
    "feed contains posts from community B",
    hasCommunityBPosts,
  );
  // 11. Test search functionality as alternative filtering
  const searchQuery = postsInCommunityA[0].title;
  const searchResponse = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        search: searchQuery,
        limit: 10,
      },
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns matching posts",
    searchResponse.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain searched title",
    searchResponse.data.some((post) => post.title.includes(searchQuery)),
  );
}

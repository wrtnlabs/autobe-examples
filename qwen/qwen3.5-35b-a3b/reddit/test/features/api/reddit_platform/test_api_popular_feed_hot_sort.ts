import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
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

export async function test_api_popular_feed_hot_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Create a community for test posts
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = {
    ...connection.headers,
    Authorization: auth.token.access,
  };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(6).toLowerCase(),
          description: "Test community for popular feed sorting validation",
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple test posts for sorting validation
  const posts: IRedditPlatformPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await api.functional.redditPlatform.member.posts.create(
      communityConnection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${i + 1}: ${RandomGenerator.paragraph({
            sentences: 2,
          })}`,
          post_type: "text",
          text_content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Access popular feed endpoint with default hot sort
  const feedConnection: api.IConnection = { host: connection.host };
  feedConnection.headers = {
    ...connection.headers,
    Authorization: auth.token.access,
  };
  const feed = await api.functional.redditPlatform.member.feeds.popular.index(
    feedConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformPopularFeedRequest,
    },
  );
  typia.assert(feed);
  // 5. Validate pagination metadata structure and values
  TestValidator.equals(
    "pagination current page is 1",
    feed.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    feed.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    feed.pagination.pages >= 0,
  );
  // 6. Calculate and verify total pages
  const expectedPages =
    feed.pagination.records > 0
      ? Math.ceil(feed.pagination.records / feed.pagination.limit)
      : 0;
  TestValidator.equals(
    "total pages calculated correctly",
    feed.pagination.pages,
    expectedPages,
  );
  // 7. Validate post count matches pagination records
  TestValidator.equals(
    "posts count matches pagination records",
    feed.data.length,
    feed.pagination.records,
  );
  // 8. Validate each post has required fields and is not soft deleted
  for (const post of feed.data) {
    // Post summary fields
    typia.assert(post);
    TestValidator.equals("post id exists", post.id !== undefined, true);
    TestValidator.equals("post title exists", post.title.length > 0, true);
    TestValidator.equals(
      "post type is valid",
      ["text", "link", "image"].includes(post.post_type),
      true,
    );
    TestValidator.equals(
      "post upvotes_count is non-negative",
      post.upvotes_count >= 0,
      true,
    );
    TestValidator.equals(
      "post downvotes_count is non-negative",
      post.downvotes_count >= 0,
      true,
    );
    TestValidator.equals(
      "post comment_count is non-negative",
      post.comment_count >= 0,
      true,
    );
    // Author fields
    typia.assert(post.author);
    TestValidator.equals(
      "author id exists",
      post.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      "author username exists",
      post.author.username !== undefined,
      true,
    );
    TestValidator.equals(
      "author karma exists",
      post.author.karma !== undefined,
      true,
    );
    TestValidator.equals(
      "author created_at exists",
      post.author.created_at !== undefined,
      true,
    );
    // Community fields
    typia.assert(post.community);
    TestValidator.equals(
      "community id exists",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community name exists",
      post.community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community subscriber_count exists",
      post.community.subscriber_count !== undefined,
      true,
    );
    TestValidator.equals(
      "community owner exists",
      post.community.owner !== undefined,
      true,
    );
    TestValidator.equals(
      "post created_at exists",
      post.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post updated_at exists",
      post.updated_at !== undefined,
      true,
    );
    // Verify soft deletion exclusion
    TestValidator.equals("post is not soft deleted", post.deleted_at, null);
  }
  // 9. Verify sorting order when multiple posts exist
  if (feed.data.length >= 2) {
    for (let i = 0; i < feed.data.length - 1; i++) {
      const current = feed.data[i];
      const next = feed.data[i + 1];
      const currentScore = current.upvotes_count - current.downvotes_count;
      const nextScore = next.upvotes_count - next.downvotes_count;
      TestValidator.predicate(
        "posts are sorted by hot algorithm (engagement + recency)",
        currentScore > nextScore ||
          (currentScore === nextScore &&
            new Date(current.created_at) >= new Date(next.created_at)),
      );
    }
  }
}

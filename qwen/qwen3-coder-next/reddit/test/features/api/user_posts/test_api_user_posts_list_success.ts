import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_user_posts_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member user (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditLike.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(author);
  // Step 2: Subscribe to multiple communities
  const communities = [
    "typescript",
    "javascript",
    "webdev",
    "reactjs",
    "nodejs",
  ] as const;
  const communityIds: string[] = [];
  for (const communityName of communities) {
    const subscription =
      await api.functional.redditLike.member.communities.subscribe.create(
        authorConnection,
        {
          communityName,
        },
      );
    typia.assert(subscription);
    communityIds.push(subscription.community.id);
  }
  // Step 3: Create multiple posts in various communities with different types
  const createdPosts: IRedditLikePost.ISummary[] = [];
  // Create text post in first community
  const textPost = await api.functional.redditLike.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        community_id: communityIds[0],
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost);
  createdPosts.push({
    id: textPost.id,
    title: textPost.title,
    author: textPost.author,
    community: textPost.community,
    score: textPost.score,
    comment_count: textPost.comment_count,
    created_at: textPost.created_at,
  });
  // Create link post in second community
  const linkPost = await api.functional.redditLike.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "link" as const,
        url: "https://example.com/article" satisfies string &
          tags.Format<"uri">,
        community_id: communityIds[1],
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(linkPost);
  createdPosts.push({
    id: linkPost.id,
    title: linkPost.title,
    author: linkPost.author,
    community: linkPost.community,
    score: linkPost.score,
    comment_count: linkPost.comment_count,
    created_at: linkPost.created_at,
  });
  // Create image post in third community
  const imagePost = await api.functional.redditLike.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "image" as const,
        image_url: "https://example.com/image.jpg" satisfies string &
          tags.Format<"uri">,
        community_id: communityIds[2],
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(imagePost);
  createdPosts.push({
    id: imagePost.id,
    title: imagePost.title,
    author: imagePost.author,
    community: imagePost.community,
    score: imagePost.score,
    comment_count: imagePost.comment_count,
    created_at: imagePost.created_at,
  });
  // Create more posts for pagination testing
  for (let i = 0; i < 5; i++) {
    const additionalPost = await api.functional.redditLike.member.posts.create(
      authorConnection,
      {
        body: {
          title: `Additional post ${i + 1} - ${RandomGenerator.name(2)}`,
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 3 }),
          community_id: communityIds[i % communityIds.length],
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(additionalPost);
    createdPosts.push({
      id: additionalPost.id,
      title: additionalPost.title,
      author: additionalPost.author,
      community: additionalPost.community,
      score: additionalPost.score,
      comment_count: additionalPost.comment_count,
      created_at: additionalPost.created_at,
    });
  }
  // Step 4: Call /redditLike/users/{userId}/posts with pagination parameters
  const limit = 5;
  const response1 = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId: author.id,
      body: {
        limit,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(response1);
  // Step 5: Verify pagination metadata
  TestValidator.equals("current page is 1", response1.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    response1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "records count matches",
    () => response1.pagination.records >= createdPosts.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    () => response1.pagination.pages >= Math.ceil(createdPosts.length / limit),
  );
  // Step 6: Verify post summary data structure
  TestValidator.equals(
    "post count matches limit or less",
    response1.data.length,
    Math.min(createdPosts.length, limit),
  );
  for (const post of response1.data) {
    typia.assert(post);
    typia.assert(post.author);
    typia.assert(post.community);
    // Verify required fields exist
    TestValidator.predicate("post has id", () => Boolean(post.id));
    TestValidator.predicate("post has title", () => Boolean(post.title));
    TestValidator.predicate("post has author", () => Boolean(post.author));
    TestValidator.predicate("post has community", () =>
      Boolean(post.community),
    );
    TestValidator.predicate(
      "post has score",
      () => typeof post.score === "number",
    );
    TestValidator.predicate(
      "post has comment_count",
      () => typeof post.comment_count === "number",
    );
    TestValidator.predicate("post has created_at", () =>
      Boolean(post.created_at),
    );
  }
  // Step 7: Verify posts are sorted by created_at descending (newest first)
  for (let i = 0; i < response1.data.length - 1; i++) {
    TestValidator.predicate(
      "posts sorted by created_at descending",
      () =>
        new Date(response1.data[i].created_at).getTime() >=
        new Date(response1.data[i + 1].created_at).getTime(),
    );
  }
  // Step 8: Test pagination by requesting next page with cursor from previous response
  const lastPost = response1.data[response1.data.length - 1];
  const response2 = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId: author.id,
      body: {
        limit,
        cursor: lastPost.created_at,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(response2);
  // Step 9: Verify pagination continues correctly
  TestValidator.equals(
    "second page starts after first",
    response2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has posts",
    () => response2.data.length > 0,
  );
  // Step 10: Verify posts on second page are older than last post on first page
  for (const post of response2.data) {
    TestValidator.predicate(
      "posts on second page are older",
      () =>
        new Date(post.created_at).getTime() <
        new Date(lastPost.created_at).getTime(),
    );
  }
  // Step 11: Test with different limit
  const smallLimit = 3;
  const response3 = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId: author.id,
      body: {
        limit: smallLimit,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(response3);
  TestValidator.equals(
    "limit 3 returns 3 posts",
    response3.data.length,
    Math.min(createdPosts.length, smallLimit),
  );
}

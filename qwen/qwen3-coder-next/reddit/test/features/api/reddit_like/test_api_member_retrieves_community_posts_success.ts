import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_retrieves_community_posts_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (community creator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Create second member (community subscriber and post retriever)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 3. Member 1 creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(1),
        icon_url: RandomGenerator.pick([
          "https://example.com/community-icon.png",
          null,
        ]) as any,
      },
    },
  );
  typia.assert(community);
  // 4. Member 2 subscribes to the community
  await api.functional.redditLike.member.communities.my.index(
    member2Connection,
  );
  // 5. Member 1 creates multiple test posts for pagination testing
  const posts: IRedditLikePost[] = [];
  for (const i of ArrayUtil.repeat(5, (i: number) => i)) {
    const postType = RandomGenerator.pick(["text", "link", "image"] as const);
    const post = await generate_random_reddit_like_member_posts_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.name(RandomGenerator.alphabets(3).length),
          type: postType,
          content:
            postType === "text"
              ? RandomGenerator.paragraph({ sentences: 3 })
              : undefined,
          url:
            postType === "link"
              ? (RandomGenerator.pick([
                  "https://example.com/article1",
                  "https://example.com/article2",
                ]) as any)
              : undefined,
          image_url:
            postType === "image"
              ? (RandomGenerator.pick([
                  "https://example.com/image1.jpg",
                  "https://example.com/image2.jpg",
                ]) as any)
              : undefined,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 6. Member 2 retrieves paginated posts
  const result = await api.functional.redditLike.member.communities.posts.index(
    member2Connection,
    {
      communityName: community.name,
      body: {
        title: RandomGenerator.name(2),
        type: "text" as const,
        communityName: community.name,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // 8. Validate posts
  TestValidator.predicate("has posts", result.data.length > 0);
  for (const post of result.data) {
    typia.assert(post);
    TestValidator.equals(
      "community name matches",
      post.community.name,
      community.name,
    );
    TestValidator.predicate("valid author", post.author.id !== undefined);
    TestValidator.predicate("valid vote score", post.voteScore >= 0);
    TestValidator.predicate("valid comment count", post.commentCount >= 0);
    TestValidator.predicate("valid created at", post.createdAt !== undefined);
  }
}

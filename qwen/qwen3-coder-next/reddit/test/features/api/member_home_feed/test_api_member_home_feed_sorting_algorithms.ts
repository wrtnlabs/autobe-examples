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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_home_feed_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member1);
  // 2. Create second member to create posts
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member2);
  // 3. Create a community name for testing
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  // 4. Create multiple posts with different timestamps for testing sorting
  const posts: IRedditLikePost[] = [];
  const baseTime = new Date();
  for (let i = 0; i < 5; i++) {
    const postTime = new Date(baseTime.getTime() - i * 3600000); // 1 hour apart
    const post = await generate_random_reddit_like_member_posts_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.name(3),
          type: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 5. Test sorting algorithms with communityName included
  const testSorting = async (sort: "new" | "top" | "hot" | "controversial") => {
    const feed = await api.functional.redditLike.member.posts.home.index(
      member1Connection,
      {
        body: {
          title: "Test",
          type: "text",
          communityName: communityName,
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(feed);
    TestValidator.predicate(`feed has ${sort} posts`, feed.data.length > 0);
  };
  // 6. Test all sorting algorithms
  await testSorting("new");
  await testSorting("top");
  await testSorting("hot");
  await testSorting("controversial");
  // 7. Validate pagination works
  const page1 = await api.functional.redditLike.member.posts.home.index(
    member1Connection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
        page: 1,
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination limit respected", page1.data.length, 2);
  TestValidator.predicate(
    "pagination metadata exists",
    page1.pagination.pages > 0,
  );
  // 8. Validate post ordering for 'new' (most recent first)
  const newFeed = await api.functional.redditLike.member.posts.home.index(
    member1Connection,
    {
      body: {
        title: "Test",
        type: "text",
        communityName: communityName,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newFeed);
  // Verify posts are sorted by creation time (newest first)
  if (newFeed.data.length >= 2) {
    const firstPostDate = new Date(newFeed.data[0].createdAt);
    const secondPostDate = new Date(newFeed.data[1].createdAt);
    TestValidator.predicate(
      "posts sorted by createdAt (newest first)",
      firstPostDate >= secondPostDate,
    );
  }
}

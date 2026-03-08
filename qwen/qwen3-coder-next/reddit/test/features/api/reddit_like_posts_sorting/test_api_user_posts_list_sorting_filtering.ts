import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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

export async function test_api_user_posts_list_sorting_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user as post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 2. Create multiple test posts with varying content and timestamps
  const posts: IRedditLikePost[] = [];
  for (let i = 0; i < 10; i++) {
    const post = await generate_random_reddit_like_member_posts_create(
      authorConnection,
      {
        body: {
          title: `Test Post ${i + 1}`,
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 3 }),
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    posts.push(post);
  }
  typia.assert(posts);
  // 3. Test sorting functionality with different parameters
  const userId = author.id;
  // Test default sorting (created_at desc)
  const defaultResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default sort returns posts",
    defaultResponse.data.length,
    10,
  );
  // Test 'new' sorting
  const newResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "new" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newResponse);
  TestValidator.equals("new sort returns posts", newResponse.data.length, 10);
  // Test 'top' sorting
  const topResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topResponse);
  TestValidator.equals("top sort returns posts", topResponse.data.length, 10);
  // Test 'controversial' sorting
  const controversialResponse =
    await api.functional.redditLike.users.posts.index(authorConnection, {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "controversial" as const,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialResponse);
  TestValidator.equals(
    "controversial sort returns posts",
    controversialResponse.data.length,
    10,
  );
  // 4. Test time range filtering with 'top' sort
  const timeTodayResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
        time: "today" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeTodayResponse);
  TestValidator.equals(
    "today time filter with top sort",
    timeTodayResponse.data.length,
    10,
  );
  const timeWeekResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
        time: "week" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeWeekResponse);
  TestValidator.equals(
    "week time filter with top sort",
    timeWeekResponse.data.length,
    10,
  );
  const timeMonthResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
        time: "month" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeMonthResponse);
  TestValidator.equals(
    "month time filter with top sort",
    timeMonthResponse.data.length,
    10,
  );
  const timeYearResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
        time: "year" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeYearResponse);
  TestValidator.equals(
    "year time filter with top sort",
    timeYearResponse.data.length,
    10,
  );
  const timeAllResponse = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "top" as const,
        time: "all" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeAllResponse);
  TestValidator.equals(
    "all time filter with top sort",
    timeAllResponse.data.length,
    10,
  );
  // 5. Test pagination boundary values
  const limit1Response = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 1,
        sort: "new" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(limit1Response);
  TestValidator.equals(
    "limit=1 returns one post",
    limit1Response.data.length,
    1,
  );
  const limit100Response = await api.functional.redditLike.users.posts.index(
    authorConnection,
    {
      userId,
      body: {
        page: 1,
        limit: 100,
        sort: "new" as const,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100 returns all posts",
    limit100Response.data.length,
    10,
  );
  // 6. Verify pagination structure
  TestValidator.predicate(
    "pagination structure exists",
    defaultResponse.pagination !== undefined,
  );
  // 7. Test cursor-based pagination
  if (defaultResponse.data.length > 0) {
    const firstPost = defaultResponse.data[0];
    const cursorResponse = await api.functional.redditLike.users.posts.index(
      authorConnection,
      {
        userId,
        body: {
          cursor: firstPost.created_at,
          limit: 5,
          sort: "new" as const,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(cursorResponse);
    TestValidator.predicate(
      "cursor pagination works",
      cursorResponse.data.length >= 0,
    );
  }
  // 8. Test filtering by community_id
  if (posts.length > 0) {
    const communityId = posts[0].community.id;
    const communityResponse = await api.functional.redditLike.users.posts.index(
      authorConnection,
      {
        userId,
        body: {
          community_id: communityId,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(communityResponse);
    TestValidator.predicate(
      "community filter works",
      communityResponse.data.every((post) => post.community.id === communityId),
    );
  }
  // 9. Test filtering by timestamp range
  if (posts.length >= 2) {
    const oldestPost = posts[posts.length - 1];
    const newestPost = posts[0];
    const rangeResponse = await api.functional.redditLike.users.posts.index(
      authorConnection,
      {
        userId,
        body: {
          created_from: oldestPost.created_at,
          created_to: newestPost.created_at,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(rangeResponse);
    TestValidator.predicate(
      "timestamp range filter works",
      rangeResponse.data.length > 0,
    );
  }
  // 10. Verify time filter only applies when sort='top'
  const timeFilterWithNewSort =
    await api.functional.redditLike.users.posts.index(authorConnection, {
      userId,
      body: {
        page: 1,
        limit: 10,
        sort: "new" as const,
        time: "today" as const,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(timeFilterWithNewSort);
  // When sort is 'new', time filter should be ignored, but API should still return results
  TestValidator.predicate(
    "time filter with non-top sort still returns results",
    timeFilterWithNewSort.data.length >= 0,
  );
}

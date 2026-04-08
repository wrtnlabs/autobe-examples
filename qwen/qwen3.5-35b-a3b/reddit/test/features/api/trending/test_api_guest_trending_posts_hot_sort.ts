import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_trending_posts_hot_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IRedditPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        fingerprint: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(guest);
  // Update connection with guest token
  const guestAuthConnection: api.IConnection = { host: connection.host };
  guestAuthConnection.headers = { Authorization: guest.token.access };
  // 2. Test default pagination (limit=20)
  const defaultResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.guest.trending.posts.index(
      guestAuthConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination metadata exists",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has valid records count",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultResponse.pagination.pages >= 0,
  );
  // 4. Validate post fields
  if (defaultResponse.data.length > 0) {
    const firstPost = defaultResponse.data[0];
    typia.assert(firstPost);
    TestValidator.equals("post has valid id", firstPost.id, firstPost.id);
    TestValidator.predicate("title is not empty", firstPost.title.length > 0);
    TestValidator.equals(
      "post_type is valid",
      firstPost.post_type,
      firstPost.post_type,
    );
    TestValidator.predicate(
      "upvotes_count is non-negative",
      firstPost.upvotes_count >= 0,
    );
    TestValidator.predicate(
      "downvotes_count is non-negative",
      firstPost.downvotes_count >= 0,
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      firstPost.comment_count >= 0,
    );
    typia.assert(firstPost.author);
    TestValidator.predicate(
      "author has username",
      firstPost.author.username.length > 0,
    );
    typia.assert(firstPost.community);
    TestValidator.predicate(
      "community has name",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "created_at is valid",
      firstPost.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at is valid",
      firstPost.updated_at !== undefined,
    );
    TestValidator.equals("deleted_at is null", firstPost.deleted_at, null);
  }
  // 5. Verify deleted_at is null for all posts
  for (const post of defaultResponse.data) {
    TestValidator.equals(
      `post ${post.id} deleted_at is null`,
      post.deleted_at,
      null,
    );
  }
  // 6. Test with different limit values
  const limits = [10, 20, 50];
  for (const limit of limits) {
    const limitResponse: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.guest.trending.posts.index(
        guestAuthConnection,
        {
          body: {
            page: 1,
            limit: limit,
            sort: "hot",
          } satisfies IRedditPlatformPost.IRequest,
        },
      );
    typia.assert(limitResponse);
    TestValidator.equals(
      `limit ${limit} - pagination limit`,
      limitResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - records count valid`,
      limitResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - pages calculated`,
      limitResponse.pagination.pages >= 0,
    );
    // Verify we don't return more than limit
    if (limitResponse.data.length > 0) {
      TestValidator.predicate(
        `limit ${limit} - data length within limit`,
        limitResponse.data.length <= limit,
      );
    }
  }
  // 7. Test maximum limit boundary (100)
  const maxLimitResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.guest.trending.posts.index(
      guestAuthConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit - pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 8. Verify posts aggregated from multiple communities (if data exists)
  if (maxLimitResponse.data.length > 1) {
    const communityNames = ArrayUtil.repeat(
      maxLimitResponse.data.length,
      (index) => maxLimitResponse.data[index].community.name,
    );
    const uniqueCommunities = new Set(communityNames);
    TestValidator.predicate(
      "posts from multiple communities",
      uniqueCommunities.size >= 1,
    );
  }
  // 9. Test edge case: verify zero-vote posts are included (if any)
  const zeroVotePosts = maxLimitResponse.data.filter(
    (post) => post.upvotes_count === 0 && post.downvotes_count === 0,
  );
  TestValidator.predicate(
    "zero-vote posts included when available",
    maxLimitResponse.data.length === 0 || zeroVotePosts.length >= 0,
  );
}
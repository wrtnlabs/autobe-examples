import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_member_home_feed_with_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate a member
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // Use member-specific connection for subsequent requests
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...connection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Call home feed endpoint with default parameters (page=1, limit=10, sort="new")
  const feedRequest = {
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
    >(),
    sort: "new" as const,
  } satisfies IRedditPlatformPost.IRequest;
  const feedResponse =
    await api.functional.redditPlatform.member.feeds.home.index(
      authConnection,
      { body: feedRequest },
    );
  typia.assert(feedResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    feedRequest.page,
  );
  TestValidator.equals(
    "pagination limit",
    feedResponse.pagination.limit,
    feedRequest.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    feedResponse.pagination.pages ===
      Math.max(
        0,
        Math.ceil(
          feedResponse.pagination.records / feedResponse.pagination.limit,
        ),
      ),
  );
  // 4. Validate data array length within limit
  TestValidator.predicate(
    "data array length within limit",
    feedResponse.data.length <= feedRequest.limit,
  );
  // 5. Validate each post has required aggregations and summaries
  for (const post of feedResponse.data) {
    typia.assert(post);
    // Validate post type enum
    TestValidator.predicate(
      `post ${post.id} has valid post_type`,
      ["text", "link", "image"].includes(post.post_type),
    );
    // Validate vote counts are non-negative
    TestValidator.predicate(
      `post ${post.id} has non-negative upvotes`,
      post.upvotes_count >= 0,
    );
    TestValidator.predicate(
      `post ${post.id} has non-negative downvotes`,
      post.downvotes_count >= 0,
    );
    TestValidator.predicate(
      `post ${post.id} has non-negative comment count`,
      post.comment_count >= 0,
    );
    // Validate author summary has required fields
    typia.assert(post.author);
    TestValidator.predicate(
      `author ${post.author.id} has valid id`,
      typeof post.author.id === "string" && post.author.id.length > 0,
    );
    TestValidator.predicate(
      `author ${post.author.id} has username`,
      typeof post.author.username === "string" &&
        post.author.username.length > 0,
    );
    TestValidator.predicate(
      `author ${post.author.id} has karma`,
      typeof post.author.karma === "number" && !Number.isNaN(post.author.karma),
    );
    TestValidator.predicate(
      `author ${post.author.id} has created_at`,
      typeof post.author.created_at === "string" &&
        !isNaN(Date.parse(post.author.created_at)),
    );
    // Validate community summary has required fields
    typia.assert(post.community);
    TestValidator.predicate(
      `community ${post.community.id} has valid id`,
      typeof post.community.id === "string" && post.community.id.length > 0,
    );
    TestValidator.predicate(
      `community ${post.community.id} has name`,
      typeof post.community.name === "string" && post.community.name.length > 0,
    );
    TestValidator.predicate(
      `community ${post.community.id} has subscriber_count`,
      typeof post.community.subscriber_count === "number" &&
        !Number.isNaN(post.community.subscriber_count),
    );
    TestValidator.predicate(
      `community ${post.community.id} has owner`,
      post.community.owner !== undefined,
    );
    TestValidator.predicate(
      `community ${post.community.id} has created_at`,
      typeof post.community.created_at === "string" &&
        !isNaN(Date.parse(post.community.created_at)),
    );
    TestValidator.predicate(
      `community ${post.community.id} has updated_at`,
      typeof post.community.updated_at === "string" &&
        !isNaN(Date.parse(post.community.updated_at)),
    );
    // Validate datetime format for post timestamps
    TestValidator.predicate(
      `post ${post.id} created_at is valid ISO 8601`,
      !isNaN(Date.parse(post.created_at)),
    );
    TestValidator.predicate(
      `post ${post.id} updated_at is valid ISO 8601`,
      !isNaN(Date.parse(post.updated_at)),
    );
    TestValidator.predicate(
      `post ${post.id} deleted_at is null or valid ISO 8601`,
      post.deleted_at === null || !isNaN(Date.parse(post.deleted_at)),
    );
    // Validate datetime format for community timestamps
    TestValidator.predicate(
      `community ${post.community.id} created_at is valid ISO 8601`,
      !isNaN(Date.parse(post.community.created_at)),
    );
    TestValidator.predicate(
      `community ${post.community.id} updated_at is valid ISO 8601`,
      !isNaN(Date.parse(post.community.updated_at)),
    );
    TestValidator.predicate(
      `community ${post.community.id} deleted_at is null or valid ISO 8601`,
      post.community.deleted_at === null ||
        !isNaN(Date.parse(post.community.deleted_at)),
    );
  }
  // 6. Validate sorting behavior (default 'new' = most recent first)
  if (feedResponse.data.length > 1) {
    for (let i = 1; i < feedResponse.data.length; i++) {
      TestValidator.predicate(
        `posts are sorted by created_at descending (page ${feedRequest.page})`,
        new Date(feedResponse.data[i - 1].created_at) >=
          new Date(feedResponse.data[i].created_at),
      );
    }
  }
  // 7. Test pagination with different page number
  const secondPageRequest = {
    ...feedRequest,
    page: 2,
  } satisfies IRedditPlatformPost.IRequest;
  const secondPageResponse =
    await api.functional.redditPlatform.member.feeds.home.index(
      authConnection,
      { body: secondPageRequest },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page number",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "second page has different data than first page",
    feedResponse.data.length > 0 && secondPageResponse.data.length > 0
      ? feedResponse.data[0].id
      : null,
    secondPageResponse.data[0]?.id ?? null,
  );
  // 8. Test with different sort options
  for (const sort of [
    "hot" as const,
    "top" as const,
    "controversial" as const,
  ]) {
    const sortRequest = {
      ...feedRequest,
      sort,
    } satisfies IRedditPlatformPost.IRequest;
    const sortResponse =
      await api.functional.redditPlatform.member.feeds.home.index(
        authConnection,
        { body: sortRequest },
      );
    typia.assert(sortResponse);
    TestValidator.equals(
      `sort ${sort} returns correct page`,
      sortResponse.pagination.current,
      feedRequest.page,
    );
    TestValidator.predicate(
      `sort ${sort} returns non-negative records`,
      sortResponse.pagination.records >= 0,
    );
  }
  // 9. Test with limit parameter
  const limitRequest = {
    ...feedRequest,
    limit: 5,
  } satisfies IRedditPlatformPost.IRequest;
  const limitResponse =
    await api.functional.redditPlatform.member.feeds.home.index(
      authConnection,
      { body: limitRequest },
    );
  typia.assert(limitResponse);
  TestValidator.equals(
    "limit parameter applied",
    limitResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length respects limit",
    limitResponse.data.length <= 5,
  );
}

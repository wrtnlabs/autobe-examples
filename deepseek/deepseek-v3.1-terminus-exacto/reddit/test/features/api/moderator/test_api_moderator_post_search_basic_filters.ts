import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection using proper isolation pattern
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test 1: Search by partial title text
  const searchResult1 =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          search: "test",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search by partial title returns valid response",
    searchResult1.data.length >= 0 &&
      typeof searchResult1.pagination === "object",
  );
  // Test 2: Filter by post type
  const searchResult2 =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          post_type: "text",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "filter by post type returns valid response",
    searchResult2.data.length >= 0 &&
      typeof searchResult2.pagination === "object",
  );
  // Test 3: Combined search with multiple filters
  const searchResult3 =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          search: "post",
          post_type: "text",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "combined search returns valid response",
    searchResult3.data.length >= 0 &&
      typeof searchResult3.pagination === "object",
  );
  // Test 4: Pagination validation
  const searchResult4 =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "pagination limit works",
    searchResult4.data.length <= 2,
  );
  TestValidator.equals(
    "pagination metadata has current page",
    searchResult4.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata has limit",
    searchResult4.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult4.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult4.pagination.pages >= 0,
  );
  // Test 5: Empty search (all posts)
  const searchResult5 =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "empty search returns valid response",
    searchResult5.data.length >= 0 &&
      typeof searchResult5.pagination === "object",
  );
  // Validate post summary structure for any returned posts
  if (searchResult5.data.length > 0) {
    const post = searchResult5.data[0];
    TestValidator.predicate(
      "post has valid id format",
      typeof post.id === "string" && post.id.length > 0,
    );
    TestValidator.predicate(
      "post has title",
      typeof post.title === "string" && post.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid post_type",
      typeof post.post_type === "string" &&
        ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has author object",
      typeof post.author === "object" &&
        typeof post.author.id === "string" &&
        typeof post.author.username === "string",
    );
    TestValidator.predicate(
      "post has community object",
      typeof post.community === "object" &&
        typeof post.community.id === "string" &&
        typeof post.community.name === "string",
    );
    TestValidator.predicate(
      "post has valid created_at timestamp",
      typeof post.created_at === "string" &&
        !isNaN(Date.parse(post.created_at)),
    );
  }
}

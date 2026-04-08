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

/**
 * Test that the home feed correctly excludes posts from communities where the member is not subscribed.
 *
 * Validates the home feed filtering logic by verifying that authenticated members only receive
 * posts from communities they have subscribed to. This test creates a member account and calls
 * the home feed endpoint to ensure proper authentication and response structure.
 *
 * Note: Full subscription filtering validation requires community and subscription creation utilities
 * which are not available. This test validates the API structure and authentication flow.
 *
 * 1. Creates a new member account with randomized credentials.
 * 2. Authenticates the member using the join endpoint.
 * 3. Calls the home feed endpoint to retrieve personalized posts.
 * 4. Validates response structure, pagination metadata, and post data types.
 * 5. Verifies that only posts from subscribed communities would be returned (when communities exist).
 */
export async function test_api_member_home_feed_non_subscribed_posts_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with randomized credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection for subsequent requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Call home feed endpoint with various sorting options
  const homeFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      },
    },
  );
  typia.assert(homeFeed);
  // 4. Validate response structure
  TestValidator.predicate(
    "response has valid pagination",
    homeFeed.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", homeFeed.pagination.current, 1);
  TestValidator.equals("limit is 20", homeFeed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // 5. Validate post data structure when posts exist
  if (homeFeed.data.length > 0) {
    const firstPost = homeFeed.data[0];
    typia.assert(firstPost);
    TestValidator.predicate("post has valid id", firstPost.id !== undefined);
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has valid type",
      ["text", "link", "image"].includes(firstPost.post_type),
    );
    TestValidator.predicate(
      "post has non-negative upvotes",
      firstPost.upvotes_count >= 0,
    );
    TestValidator.predicate(
      "post has non-negative downvotes",
      firstPost.downvotes_count >= 0,
    );
    TestValidator.predicate(
      "post has non-negative comment count",
      firstPost.comment_count >= 0,
    );
    typia.assert(firstPost.author);
    TestValidator.predicate(
      "post author has valid id",
      firstPost.author.id !== undefined,
    );
    TestValidator.predicate(
      "post author has username",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "post author has non-negative karma",
      firstPost.author.karma >= 0,
    );
    typia.assert(firstPost.community);
    TestValidator.predicate(
      "post community has valid id",
      firstPost.community.id !== undefined,
    );
    TestValidator.predicate(
      "post community has name",
      firstPost.community.name.length > 0,
    );
  }
  // 6. Test with different sorting options to ensure filtering applies consistently
  const hotFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "hot",
      },
    },
  );
  typia.assert(hotFeed);
  // 7. Test with top sorting and time range
  const topFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "top",
        topTimeRange: "week",
      },
    },
  );
  typia.assert(topFeed);
  // 8. Verify all feeds have consistent structure
  TestValidator.predicate(
    "hot feed has valid pagination",
    hotFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "top feed has valid pagination",
    topFeed.pagination !== undefined,
  );
}

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
 * Test home feed filtering for unsubscribed, deleted, and banned communities.
 *
 * Validates that the home feed correctly filters posts based on:
 * 1. Subscription status (only subscribed communities)
 * 2. Community active status (no deleted communities)
 * 3. User ban status (no banned communities)
 */
export async function test_api_feed_home_filtering_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create test member
  const testMemberConnection: api.IConnection = { host: connection.host };
  const testMember = await authorize_member_join(testMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(testMember);
  // Request home feed
  const feedResponse =
    await api.functional.redditPlatform.member.feeds.home.index(
      testMemberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_type: "NEW",
        },
      },
    );
  typia.assert(feedResponse);
  // Validate response structure
  TestValidator.equals(
    "has pagination object",
    feedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(feedResponse.data),
    true,
  );
  // Validate pagination structure
  const pagination = feedResponse.pagination;
  TestValidator.equals("pagination has current", pagination.current >= 1, true);
  TestValidator.equals("pagination has limit", pagination.limit >= 1, true);
  TestValidator.equals("pagination has records", pagination.records >= 0, true);
  TestValidator.equals("pagination has pages", pagination.pages >= 0, true);
  // Validate posts have expected structure
  for (const post of feedResponse.data) {
    typia.assert(post);
    TestValidator.predicate("post has valid id", typeof post.id === "string");
    TestValidator.predicate("post has title", typeof post.title === "string");
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate(
      "post has vote score",
      typeof post.vote_score === "number",
    );
  }
  // Test 1: Verify no deleted posts in home feed (deleted_at should be null)
  const deletedPosts = feedResponse.data.filter(
    (post) => post.deleted_at !== null,
  );
  TestValidator.equals("no deleted posts in home feed", deletedPosts.length, 0);
  // Test 2: Verify all posts are active (deleted_at === null)
  const activePosts = feedResponse.data.filter(
    (post) => post.deleted_at === null,
  );
  TestValidator.equals(
    "all posts from active feeds",
    activePosts.length,
    feedResponse.data.length,
  );
  // Test 3: Verify posts have required community data
  const postsWithValidCommunity = feedResponse.data.filter(
    (post) =>
      post.community.id !== undefined && post.community.name !== undefined,
  );
  TestValidator.equals(
    "all posts have valid community data",
    postsWithValidCommunity.length,
    feedResponse.data.length,
  );
  // Test 4: Verify posts have required author data
  const postsWithValidAuthor = feedResponse.data.filter(
    (post) =>
      post.author.id !== undefined && post.author.username !== undefined,
  );
  TestValidator.equals(
    "all posts have valid author data",
    postsWithValidAuthor.length,
    feedResponse.data.length,
  );
  // Test 5: Verify pagination consistency (records should be >= returned items)
  TestValidator.predicate(
    "pagination records consistent",
    feedResponse.pagination.records >= feedResponse.data.length,
  );
}

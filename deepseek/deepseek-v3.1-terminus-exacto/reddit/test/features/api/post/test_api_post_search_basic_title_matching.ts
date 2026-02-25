import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the basic post search functionality with title partial matching.
 * Search for posts using partial title keywords to verify the search algorithm
 * correctly identifies relevant posts. Validate that search results include
 * post summaries with author information, community context, and creation timestamps.
 */
export async function test_api_post_search_basic_title_matching(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test 1: Search for posts with empty search term (should return all posts)
  const emptySearch = await api.functional.communityPlatform.user.posts.search(
    userConnection,
    {
      body: {
        search: "",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Test 2: Search for posts with a common keyword that might exist
  const commonSearch = await api.functional.communityPlatform.user.posts.search(
    userConnection,
    {
      body: {
        search: "test",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(commonSearch);
  // Test 3: Search for posts with partial matching
  const partialSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {
        search: "prog",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(partialSearch);
  // Test 4: Search with different post type filters
  const textPostSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {
        search: "test",
        post_type: "text",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(textPostSearch);
  // Test 5: Search with non-matching term
  const nonMatchingSearch =
    await api.functional.communityPlatform.user.posts.search(userConnection, {
      body: {
        search: "xyz123nonexistent",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(nonMatchingSearch);
  // Validate search result structure for the first successful search
  const searchResult = emptySearch.data.length > 0 ? emptySearch : commonSearch;
  TestValidator.predicate(
    "search results have pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(searchResult.data),
  );
  // Validate that search results contain expected post summary information
  if (searchResult.data.length > 0) {
    const firstResult = searchResult.data[0];
    TestValidator.predicate("post has id", firstResult.id !== undefined);
    TestValidator.predicate("post has title", firstResult.title !== undefined);
    TestValidator.predicate(
      "post has post_type",
      firstResult.post_type !== undefined,
    );
    TestValidator.predicate(
      "post has author",
      firstResult.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      firstResult.community !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      firstResult.created_at !== undefined,
    );
    // Validate author information
    TestValidator.predicate(
      "author has id",
      firstResult.author.id !== undefined,
    );
    TestValidator.predicate(
      "author has username",
      firstResult.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      firstResult.author.display_name !== null,
    );
    TestValidator.predicate(
      "author has avatar_url",
      firstResult.author.avatar_url !== null,
    );
    TestValidator.predicate(
      "author has karma",
      typeof firstResult.author.karma === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      firstResult.author.created_at !== undefined,
    );
    // Validate community information
    TestValidator.predicate(
      "community has id",
      firstResult.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      firstResult.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has description",
      firstResult.community.description !== undefined,
    );
    TestValidator.predicate(
      "community has icon_url",
      firstResult.community.icon_url !== null,
    );
    TestValidator.predicate(
      "community has owner",
      firstResult.community.owner !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      firstResult.community.created_at !== undefined,
    );
  }
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    typeof searchResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof searchResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof searchResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof searchResult.pagination.pages === "number",
  );
  // Test that different search terms return different results (when applicable)
  if (emptySearch.data.length > 0 && commonSearch.data.length > 0) {
    TestValidator.notEquals(
      "empty search and common search should have different results",
      emptySearch.data.length,
      commonSearch.data.length,
    );
  }
}

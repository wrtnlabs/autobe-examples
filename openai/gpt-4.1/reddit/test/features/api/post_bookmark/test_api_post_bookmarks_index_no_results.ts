import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostBookmark";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostBookmark";

/**
 * Validates that a newly registered, authenticated user sees an empty result
 * set when listing their post bookmarks.
 *
 * Business context: This test confirms that after user self-registration,
 * performing a post bookmark index query returns an empty data array and valid
 * default pagination, since the user has not bookmarked anything yet.
 *
 * Steps:
 *
 * 1. Register a new community platform user.
 * 2. Immediately call post bookmark index with empty/default filter and
 *    pagination.
 * 3. Assert that the returned data array is empty.
 * 4. Assert that the pagination metadata in the result is correct for zero
 *    records.
 */
export async function test_api_post_bookmarks_index_no_results(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(user);

  // 2. List post bookmarks for that authenticated user (should be empty)
  const requestBody = {} satisfies ICommunityPlatformPostBookmark.IRequest;
  const bookmarks: IPageICommunityPlatformPostBookmark.ISummary =
    await api.functional.communityPlatform.user.postBookmarks.index(
      connection,
      { body: requestBody },
    );
  typia.assert(bookmarks);

  // 3. Assert the data array is empty
  TestValidator.equals("empty bookmarks data for new user", bookmarks.data, []);
  // 4. Assert correct pagination for zero results (current:1, records:0, pages:0)
  TestValidator.equals(
    "pagination current page is 1",
    bookmarks.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records is 0",
    bookmarks.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages is 0",
    bookmarks.pagination.pages,
    0,
  );
}

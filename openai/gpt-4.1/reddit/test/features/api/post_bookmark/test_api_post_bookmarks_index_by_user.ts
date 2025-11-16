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
 * Validate retrieving a paginated, filtered list of a user's own post bookmarks
 * with advanced query options.
 *
 * 1. Register two users (UserA and UserB)
 * 2. (Mock) Suppose a set of posts are available and each user has bookmarked
 *    different posts.
 *
 *    - Here we simulate bookmarks since there is no API for community/post creation
 *         or bookmark creation.
 * 3. UserA performs a PATCH request to /communityPlatform/user/postBookmarks with
 *    pagination and filter inputs.
 * 4. Validate that the returned data structure is correct, all bookmarks belong to
 *    UserA, soft-deleted bookmarks are excluded, and pagination is respected.
 * 5. Ensure unauthorized (unauthenticated) requests are rejected.
 */
export async function test_api_post_bookmarks_index_by_user(
  connection: api.IConnection,
) {
  // 1. Register two users
  const userAReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAReg);
  const userAId = userAReg.id;

  // Second user for later access checks
  // Need to re-join to switch authentication
  const userBReg = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userBReg);
  const userBId = userBReg.id;

  // 2. There are no APIs for post, community and bookmark creation,
  // so we can only test the retrieval API with typia.random
  // The test will validate core behavior: auth context, proper response typing, and correct structure

  // 3. Fetch bookmarks as authenticated UserB (ensure only own bookmarks are seen)
  // Prepare a PATCH body for advanced query (requesting page 1, limit 5, descending order)
  // We choose to select no filter for post_id -- get all
  const reqBody: ICommunityPlatformPostBookmark.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sort_order: "desc",
  };
  const resPage =
    await api.functional.communityPlatform.user.postBookmarks.index(
      connection,
      {
        body: reqBody,
      },
    );
  typia.assert(resPage);
  TestValidator.predicate(
    "all returned bookmarks belong to authenticated user",
    resPage.data.every((bm) => bm.user.id === userBId),
  );
  TestValidator.predicate(
    "no soft-deleted bookmarks are returned",
    resPage.data.every(
      (bm) => bm.deleted_at === null || bm.deleted_at === undefined,
    ),
  );

  // 4. Filtering by post_id -- only return bookmarks for a single post (if any bookmarks exist)
  if (resPage.data.length > 0) {
    const firstPostId = resPage.data[0].post.id;
    const filterBody: ICommunityPlatformPostBookmark.IRequest = {
      post_id: firstPostId,
      page: 1 as number & tags.Type<"int32">,
      limit: 5 as number & tags.Type<"int32">,
    };
    const filtered =
      await api.functional.communityPlatform.user.postBookmarks.index(
        connection,
        {
          body: filterBody,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered bookmarks all belong to post_id",
      filtered.data.every((bm) => bm.post.id === firstPostId),
    );
    TestValidator.equals(
      "pagination matches filtered records",
      filtered.pagination.current,
      1,
    );
  }

  // 5. Test as unauthenticated user (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve bookmarks",
    async () => {
      await api.functional.communityPlatform.user.postBookmarks.index(
        unauthConn,
        {
          body: reqBody,
        },
      );
    },
  );
}

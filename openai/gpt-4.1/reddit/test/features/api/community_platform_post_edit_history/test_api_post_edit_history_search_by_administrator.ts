import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Validates that an administrator can search and retrieve post edit history
 * with filters and pagination.
 *
 * 1. Join as a new administrator to establish context.
 * 2. Generate a random postId (UUID).
 * 3. Query edit history for the post with various filters: a. No filters (default
 *    page) b. Filter by random userId (non-existent) c. Filter by date range d.
 *    Filter by search keyword e. Out-of-bounds page number (to test empty
 *    results)
 * 4. Verify returned pagination info and record shapes.
 * 5. Assert edge cases: no results and non-existent filters.
 */
export async function test_api_post_edit_history_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Join as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"password">,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Generate a random postId
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3a. Query edit history with no filters (default page)
  const baseQuery = {
    postId,
    body: {},
  };
  const responseDefault: IPageICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      baseQuery,
    );
  typia.assert(responseDefault);
  TestValidator.equals(
    "pagination response for default search",
    typeof responseDefault.pagination,
    "object",
  );
  TestValidator.equals(
    "data is array for default search",
    Array.isArray(responseDefault.data),
    true,
  );

  // 3b. Filter by random (non-existent) userId
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const respByUser: IPageICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      {
        postId,
        body: { userId: nonExistentUserId },
      },
    );
  typia.assert(respByUser);
  TestValidator.equals(
    "no results for non-existent user",
    respByUser.data.length,
    0,
  );

  // 3c. Filter by a random date range (fromDate, toDate)
  const fromDate = new Date(Date.now() - 3600 * 1e3 * 24 * 30).toISOString(); // 30 days ago
  const toDate = new Date().toISOString();
  const respByDate: IPageICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      {
        postId,
        body: { fromDate, toDate },
      },
    );
  typia.assert(respByDate);
  TestValidator.equals(
    "data is array for date filter",
    Array.isArray(respByDate.data),
    true,
  );

  // 3d. Filter by search keyword (random substring)
  const searchKeyword = RandomGenerator.paragraph({ sentences: 3 });
  const respByKeyword: IPageICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      {
        postId,
        body: { search: searchKeyword },
      },
    );
  typia.assert(respByKeyword);
  TestValidator.equals(
    "data is array for search keyword",
    Array.isArray(respByKeyword.data),
    true,
  );

  // 3e. Out-of-bounds page number (simulate empty result)
  const respByPage: IPageICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      {
        postId,
        body: { page: 9999 },
      },
    );
  typia.assert(respByPage);
  TestValidator.equals(
    "no results for out-of-bounds page",
    respByPage.data.length,
    0,
  );

  // 4. Validate that records, if any, include expected fields
  responseDefault.data.forEach((record, idx) => {
    TestValidator.predicate(
      `record user shape #${idx}`,
      typeof record.user.id === "string",
    );
    TestValidator.predicate(
      `record session shape #${idx}`,
      typeof record.userSession.id === "string",
    );
    TestValidator.predicate(
      `record session created_at #${idx}`,
      typeof record.userSession.created_at === "string",
    );
    TestValidator.predicate(
      `record created_at #${idx}`,
      typeof record.created_at === "string",
    );
  });
}

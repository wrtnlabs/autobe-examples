import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_controversial_posts_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user to access administrative analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Fetch first page of controversial posts
  const firstPage: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.admin.analytics.posts.controversial.index(
      adminConnection,
    );
  typia.assert(firstPage);
  // Validate first page metadata
  TestValidator.equals(
    "first page current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit > 0",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  // Store all fetched posts to detect duplicates and gaps
  const allFetchedPosts: ICommunityBbsPostControversialScore[] = [
    ...firstPage.data,
  ];
  // Store pagination values to track traversal
  let currentPage = firstPage.pagination.current;
  let currentLimit = firstPage.pagination.limit;
  let totalPages = firstPage.pagination.pages;
  let totalRecords = firstPage.pagination.records;
  // Step 3: Traverse remaining pages using the limit from first page, validate sequential data without duplicates or gaps
  for (let page = 2; page <= totalPages; page++) {
    // Fetch next page
    const nextPage: IPageICommunityBbsPostControversialScore =
      await api.functional.communityBbs.admin.analytics.posts.controversial.index(
        adminConnection,
      );
    typia.assert(nextPage);
    // Validate pagination metadata consistency
    TestValidator.equals(
      "page number matches expected",
      nextPage.pagination.current,
      page,
    );
    TestValidator.equals(
      "limit remains consistent across pages",
      nextPage.pagination.limit,
      currentLimit,
    );
    // Validate data integrity: no duplicates and no gaps
    const pagePosts = nextPage.data;
    // Check for duplicates within entire dataset
    for (const post of pagePosts) {
      // Check if this post already exists in the accumulated dataset
      const duplicate = allFetchedPosts.find((p) => p.post_id === post.post_id);
      // Should never find a duplicate across pages
      TestValidator.predicate(
        `no duplicate posts across pages for post_id: ${post.post_id}`,
        duplicate === undefined,
      );
    }
    // Add all posts from current page to complete dataset
    allFetchedPosts.push(...pagePosts);
  }
  // Step 4: Final validation - total records count should equal cumulative count across all pages
  TestValidator.equals(
    "total records count matches cumulative count of all fetched posts",
    totalRecords,
    allFetchedPosts.length,
  );
  // Additional validation: verify ordering by controversy_score descending (most controversial first)
  // Verify each consecutive pair is properly ordered by controversy_score
  for (let i = 0; i < allFetchedPosts.length - 1; i++) {
    const current = allFetchedPosts[i];
    const next = allFetchedPosts[i + 1];
    TestValidator.predicate(
      "controversy scores are in descending order",
      current.controversy_score >= next.controversy_score,
    );
  }
}

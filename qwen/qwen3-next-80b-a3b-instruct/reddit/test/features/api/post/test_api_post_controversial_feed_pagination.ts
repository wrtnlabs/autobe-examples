import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_post_controversial_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a valid community code with alphanumeric and hyphen format
  const communityCode: string & tags.Pattern<"^[a-z0-9-]+$"> = typia.random<
    string & tags.Pattern<"^[a-z0-9-]+$">
  >();
  // Step 2: Create a base request body for controversial feed with pagination parameters
  const baseRequestBody: ICommunityPlatformPost.IRequest = {
    sort: "controversial",
    limit: 20,
    page: 1,
  };
  // Step 3: Fetch the first page of controversial posts
  const firstPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.controversial.index(
      connection,
      {
        communityCode,
        body: baseRequestBody,
      },
    );
  typia.assert(firstPage);
  // Step 4: Validate first page pagination metadata
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page has data",
    () => firstPage.data.length > 0,
  );
  // Step 5: Verify first page contains exactly 20 posts (or fewer if fewer available)
  TestValidator.predicate(
    "first page has maximum 20 posts",
    () => firstPage.data.length <= 20,
  );
  // Step 6: Check if there are more pages available
  const totalPosts = firstPage.pagination.records;
  const expectedPages = Math.ceil(totalPosts / 20);
  TestValidator.equals(
    "first page calculated pages",
    firstPage.pagination.pages,
    expectedPages,
  );
  // Step 7: If there are multiple pages, fetch second page to validate distinct results
  if (firstPage.pagination.pages > 1) {
    const secondRequestBody: ICommunityPlatformPost.IRequest = {
      sort: "controversial",
      limit: 20,
      page: 2,
    };
    const secondPage: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.communities.posts.controversial.index(
        connection,
        {
          communityCode,
          body: secondRequestBody,
        },
      );
    typia.assert(secondPage);
    // Validate second page pagination
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
    // Verify second page contains distinct posts from first page
    const firstPageIds = new Set(firstPage.data.map((post) => post.id));
    const secondPageIds = new Set(secondPage.data.map((post) => post.id));
    // Check for overlap between first and second page
    const hasOverlap = Array.from(secondPageIds).some((id) =>
      firstPageIds.has(id),
    );
    TestValidator.predicate(
      "no overlapping posts between page 1 and 2",
      () => !hasOverlap,
    );
  }
  // Step 8: Test with limit parameter variation (10 items per page)
  const smallLimitRequest: ICommunityPlatformPost.IRequest = {
    sort: "controversial",
    limit: 10,
    page: 1,
  };
  const smallLimitPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.controversial.index(
      connection,
      {
        communityCode,
        body: smallLimitRequest,
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit page limit",
    smallLimitPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "small limit page has data",
    () => smallLimitPage.data.length > 0,
  );
  TestValidator.predicate(
    "small limit page has at most 10 posts",
    () => smallLimitPage.data.length <= 10,
  );
  // Step 9: Test with null parameters (should fall back to defaults)
  const nullParamsRequest: ICommunityPlatformPost.IRequest = {
    sort: "controversial",
    page: null,
    limit: null,
  };
  const nullParamsPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.controversial.index(
      connection,
      {
        communityCode,
        body: nullParamsRequest,
      },
    );
  typia.assert(nullParamsPage);
  TestValidator.equals(
    "null page defaults to 1",
    nullParamsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "null limit defaults to 20",
    nullParamsPage.pagination.limit,
    20,
  );
  // Step 10: Validate that timeRange parameter is ignored for controversial sort
  const withTimeRangeRequest: ICommunityPlatformPost.IRequest = {
    sort: "controversial",
    limit: 20,
    page: 1,
    timeRange: "this week",
  };
  const withTimeRangePage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.controversial.index(
      connection,
      {
        communityCode,
        body: withTimeRangeRequest,
      },
    );
  typia.assert(withTimeRangePage);
  // Validate that timeRange parameter doesn't cause error (it should be ignored)
  TestValidator.equals(
    "timeRange ignored for controversial",
    withTimeRangePage.pagination.limit,
    20,
  );
  // Step 11: Validate response structure for each post
  for (const post of firstPage.data) {
    // Verify post summary structure
    typia.assert<ICommunityPlatformPost.ISummary>(post);
    // Verify author is ICommunityPlatformMember.ISummary (empty object)
    typia.assert<ICommunityPlatformMember.ISummary>(post.author);
    // Verify community is ICommunityPlatformCommunity.ISummary
    typia.assert<ICommunityPlatformCommunity.ISummary>(post.community);
    // Validate numeric fields
    TestValidator.predicate("vote score is integer", () =>
      Number.isInteger(post.voteScore),
    );
    TestValidator.predicate(
      "comment count is non-negative integer",
      () => Number.isInteger(post.commentCount) && post.commentCount >= 0,
    );
    // Validate format - using typia.assert which includes format validation
    // No need for manual regex checks as typia.assert handles it
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPasswordResetToken";

/**
 * Validate admin password reset token search by date ranges and pagination.
 *
 * Business goal: Ensure that an authenticated adminUser can search password
 * reset tokens using createdAt and expiresAt time windows, and that the search
 * endpoint correctly paginates the results so that page/limit combinations
 * return non-overlapping, consistent slices of the filtered dataset.
 *
 * High level flow:
 *
 * 1. Join an adminUser using /auth/adminUser/join so that subsequent
 *    communityPlatform.adminUser endpoints have proper admin auth context.
 * 2. Create multiple password reset token rows via POST
 *    /communityPlatform/adminUser/passwordResetTokens, all tied to the same
 *    account_id/account_type so they stay in one logical cohort but with
 *    different created_at/updated_at and expires_at values.
 *
 *    - We cannot control created_at directly (it is server-managed), so we rely on
 *         the actual timestamps returned in the created records when building
 *         our search windows.
 *    - For expires_at we can fully control the values via
 *         ICommunityPlatformPasswordResetToken.ICreate, so we purposely create
 *         tokens with both near-future and farther-future expiry times.
 * 3. Use PATCH /communityPlatform/adminUser/passwordResetTokens with
 *    ICommunityPlatformPasswordResetToken.IRequest to search within a specific
 *    created_at-based window (createdFrom/createdTo) and a small limit to
 *    exercise pagination.
 * 4. Verify that:
 *
 *    - All returned summaries have requested_at within the specified
 *         createdFrom/createdTo ISO date-time range.
 *    - Pagination metadata (current, limit, records, pages) is coherent with the
 *         number of matching records we compute client-side.
 *    - Distinct pages with the same filter but different page numbers are
 *         non-overlapping in terms of token IDs.
 * 5. Optionally run a second search with expiresFrom/expiresTo to demonstrate that
 *    expiry-based filters select a different subset that matches only tokens
 *    whose expires_at falls within the requested window, again with consistent
 *    pagination.
 *
 * DTO / API usage mapping:
 *
 * - Admin join: api.functional.auth.adminUser.join(connection, { body:
 *   ICommunityPlatformAdminUserJoin.IRequest }) ->
 *   ICommunityPlatformAdminuser.IAuthorized This call also updates
 *   connection.headers.Authorization with the admin JWT (handled inside SDK).
 * - Token creation:
 *   api.functional.communityPlatform.adminUser.passwordResetTokens.create(
 *   connection, { body: ICommunityPlatformPasswordResetToken.ICreate } ) ->
 *   ICommunityPlatformPasswordResetToken We will call this repeatedly with a
 *   fixed account_id and account_type, differing only in token_hash, purpose,
 *   and expires_at. The created records will provide us with actual created_at
 *   timestamps.
 * - Token search:
 *   api.functional.communityPlatform.adminUser.passwordResetTokens.index(
 *   connection, { body: ICommunityPlatformPasswordResetToken.IRequest } ) ->
 *   IPageICommunityPlatformPasswordResetToken.ISummary We will fill:
 *
 *   - AccountType and accountId to narrow down to our test tokens
 *   - CreatedFrom/createdTo for creation-time window tests
 *   - ExpiresFrom/expiresTo for expiry-time window tests
 *   - Page and limit for pagination
 *
 * Detailed steps:
 *
 * 1. Admin setup
 *
 *    - Generate a random admin username and email using RandomGenerator and
 *         typia.random for email format.
 *    - Call join() and typia.assert the response as
 *         ICommunityPlatformAdminuser.IAuthorized.
 *    - Capture admin.id as our account_id and set account_type to "adminUser" so
 *         that newly created tokens are associated with this admin account.
 * 2. Create a batch of tokens
 *
 *    - Choose N (e.g., 7) tokens to provide enough data for pagination.
 *    - For each index i in [0, N):
 *
 *         - Token_hash: use RandomGenerator.alphaNumeric to ensure uniqueness.
 *         - Purpose: constant like "password_reset".
 *         - Expires_at: derive from now with varying offsets using Date arithmetic and
 *                   toISOString(), always producing string &
 *                   tags.Format<"date-time"> values.
 *         - Call create() with body satisfying
 *                   ICommunityPlatformPasswordResetToken.ICreate.
 *         - Collect each created ICommunityPlatformPasswordResetToken into an array.
 *                   typia.assert each.
 *    - After creation, sort the collected array by created_at ascending to make
 *         reasoning about windows easier.
 * 3. Build a createdAt window and test pagination
 *
 *    - Use the sorted created tokens list to derive a middle window:
 *
 *         - Select a contiguous slice of 4 tokens from index 1 through 4 (assuming N >=
 *                   5).
 *         - CreatedFrom = firstSlice.created_at.
 *         - CreatedTo = lastSlice.created_at.
 *    - Compute the set of token IDs that fall within this window by filtering our
 *         in-memory created tokens array on created_at >= createdFrom &&
 *         created_at <= createdTo.
 *    - Define a small limit, e.g., 2, so that there will be multiple pages when
 *         matching count > limit.
 *    - For page 1 and subsequent pages up to pagination.pages:
 *
 *         - Call index() with body satisfying
 *                   ICommunityPlatformPasswordResetToken.IRequest where:
 *
 *                           - Page = pageIndex
 *                           - Limit = 2
 *                           - AccountType = "adminUser"
 *                           - AccountId = admin.id
 *                           - CreatedFrom/createdTo as constructed
 *         - Typia.assert each response
 *         - Verify that:
 *
 *                           - Pagination.current === pageIndex
 *                           - Pagination.limit === limit
 *                           - Pagination.records equals the size of our filtered in-memory tokens set on
 *                                               first page
 *                           - Pagination.pages is consistent with records and limit on first page
 *         - For each summary entry, assert that its requested_at is within [createdFrom,
 *                   createdTo].
 *         - Accumulate IDs per page and ensure no overlaps between pages.
 *    - After fetching all pages, assert that the union of all IDs equals the
 *         expected ID set from the filtered in-memory tokens.
 * 4. Expiry-based window search
 *
 *    - From the original created token records, build a second window over the
 *         expires_at field:
 *
 *         - Pick a subset (e.g., tokens[1]..tokens[3]) and compute expiresFrom/expiresTo
 *                   from their expires_at values.
 *    - Call index() with a body that has expiresFrom/expiresTo and no
 *         createdFrom/createdTo, keeping accountType/accountId and limit set.
 *    - Fetch page 1 and, if pages >= 2, page 2, validating that:
 *
 *         - All returned summaries have expires_at within the window.
 *         - Pagination metadata is consistent with the number of matches on page 1.
 *         - If multiple pages exist, verify non-overlap of IDs across pages.
 *
 * Assertion philosophy:
 *
 * - Use typia.assert on all API responses to guarantee structural and type
 *   correctness.
 * - Use TestValidator.equals for pagination metadata equality checks and to
 *   verify that our computed record counts match what the server reports.
 * - Use TestValidator.predicate to express boolean conditions like "requested_at
 *   is within range" or "IDs sets are disjoint".
 * - Focus strictly on business logic and behavior validation (date window
 *   filters, pagination semantics); do not attempt to assert HTTP status codes
 *   or type-level error behavior.
 */
export async function test_api_admin_password_reset_tokens_search_date_and_pagination_ranges(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  const accountId: string & tags.Format<"uuid"> = adminAuthorized.id;
  const accountType = "adminUser" as const;

  // 2. Create a batch of password reset tokens for this admin account
  const tokenCount = 7; // enough for pagination tests
  const now = new Date();

  const createdTokens: ICommunityPlatformPasswordResetToken[] =
    await ArrayUtil.asyncRepeat(tokenCount, async (index) => {
      const expiresOffsetMs = (index + 1) * 10 * 60 * 1000; // future offsets
      const expiresAt = new Date(now.getTime() + expiresOffsetMs).toISOString();

      const createBody = {
        account_type: accountType,
        account_id: accountId,
        token_hash: RandomGenerator.alphaNumeric(32),
        purpose: "password_reset",
        expires_at: expiresAt,
      } satisfies ICommunityPlatformPasswordResetToken.ICreate;

      const created =
        await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
          connection,
          { body: createBody },
        );
      typia.assert<ICommunityPlatformPasswordResetToken>(created);
      return created;
    });

  // Sort tokens by created_at ascending to easily construct windows
  const sortedByCreated = [...createdTokens].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  // Guard to ensure we have enough data to build a mid-range window
  TestValidator.predicate(
    "should have at least 5 tokens for created_at window tests",
    sortedByCreated.length >= 5,
  );

  // Build a created_at window based on a middle slice (indices 1..4)
  const windowTokens = sortedByCreated.slice(1, 5);
  const createdFrom = windowTokens[0]!.created_at;
  const createdTo = windowTokens[windowTokens.length - 1]!.created_at;

  // Compute expected tokens within this window from full set
  const expectedCreatedWindow = sortedByCreated.filter(
    (t) => t.created_at >= createdFrom && t.created_at <= createdTo,
  );

  const limit = 2 as const;

  // Helper to call index with createdAt window and given page
  const searchByCreated = async (page: number) => {
    const body = {
      page,
      limit,
      accountType,
      accountId,
      createdFrom,
      createdTo,
    } satisfies ICommunityPlatformPasswordResetToken.IRequest;

    const pageResult =
      await api.functional.communityPlatform.adminUser.passwordResetTokens.index(
        connection,
        { body },
      );
    typia.assert<IPageICommunityPlatformPasswordResetToken.ISummary>(
      pageResult,
    );
    return pageResult;
  };

  // Fetch first page to inspect pagination metadata
  const firstPage = await searchByCreated(1);
  const firstPagination = firstPage.pagination;

  TestValidator.equals(
    "createdAt window: pagination.current is 1 on first page",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "createdAt window: pagination.limit equals requested limit",
    firstPagination.limit,
    limit,
  );

  const expectedCount = expectedCreatedWindow.length;
  TestValidator.equals(
    "createdAt window: pagination.records equals expected count",
    firstPagination.records,
    expectedCount,
  );

  const expectedPages =
    expectedCount === 0 ? 0 : Math.ceil(expectedCount / limit);
  TestValidator.equals(
    "createdAt window: pagination.pages is consistent with records and limit",
    firstPagination.pages,
    expectedPages,
  );

  // Ensure all returned items on first page are within createdAt window
  for (const summary of firstPage.data) {
    TestValidator.predicate(
      "createdAt window: first page summary.requested_at within range",
      summary.requested_at >= createdFrom && summary.requested_at <= createdTo,
    );
  }

  // Collect IDs across all pages and ensure non-overlap and completeness
  const allPageIds = new Set<string>();

  const totalPages = firstPagination.pages;
  if (totalPages > 0) {
    for (let page = 1; page <= totalPages; page += 1) {
      const pageResult = page === 1 ? firstPage : await searchByCreated(page);

      const pagination = pageResult.pagination;
      TestValidator.equals(
        `createdAt window: pagination.current matches requested page ${page}`,
        pagination.current,
        page,
      );
      TestValidator.equals(
        `createdAt window: pagination.limit equals requested limit on page ${page}`,
        pagination.limit,
        limit,
      );

      for (const summary of pageResult.data) {
        // Range check per page
        TestValidator.predicate(
          `createdAt window: page ${page} summary.requested_at within range`,
          summary.requested_at >= createdFrom &&
            summary.requested_at <= createdTo,
        );

        // Non-overlap of IDs across pages
        TestValidator.predicate(
          `createdAt window: ID ${summary.id} should not appear in multiple pages`,
          !allPageIds.has(summary.id),
        );
        allPageIds.add(summary.id);
      }
    }
  }

  // After gathering all pages, ensure union of IDs equals expected set
  const expectedIds = new Set(expectedCreatedWindow.map((t) => t.id));
  TestValidator.predicate(
    "createdAt window: all expected IDs appear exactly once across all pages",
    expectedIds.size === allPageIds.size &&
      Array.from(expectedIds).every((id) => allPageIds.has(id)),
  );

  // 4) Expiry-based window search
  const sortedByExpires = [...createdTokens].sort((a, b) =>
    a.expires_at.localeCompare(b.expires_at),
  );

  TestValidator.predicate(
    "should have at least 4 tokens for expires_at window tests",
    sortedByExpires.length >= 4,
  );

  const expiresWindowTokens = sortedByExpires.slice(1, 4);
  const expiresFrom = expiresWindowTokens[0]!.expires_at;
  const expiresTo =
    expiresWindowTokens[expiresWindowTokens.length - 1]!.expires_at;

  const expectedExpiresWindow = sortedByExpires.filter(
    (t) => t.expires_at >= expiresFrom && t.expires_at <= expiresTo,
  );

  const searchByExpires = async (page: number) => {
    const body = {
      page,
      limit,
      accountType,
      accountId,
      expiresFrom,
      expiresTo,
    } satisfies ICommunityPlatformPasswordResetToken.IRequest;

    const pageResult =
      await api.functional.communityPlatform.adminUser.passwordResetTokens.index(
        connection,
        { body },
      );
    typia.assert<IPageICommunityPlatformPasswordResetToken.ISummary>(
      pageResult,
    );
    return pageResult;
  };

  const expiresPage1 = await searchByExpires(1);
  const expiresPagination1 = expiresPage1.pagination;

  TestValidator.equals(
    "expiresAt window: pagination.current is 1 on first page",
    expiresPagination1.current,
    1,
  );
  TestValidator.equals(
    "expiresAt window: pagination.limit equals requested limit",
    expiresPagination1.limit,
    limit,
  );

  const expectedExpiresCount = expectedExpiresWindow.length;
  TestValidator.equals(
    "expiresAt window: pagination.records equals expected count",
    expiresPagination1.records,
    expectedExpiresCount,
  );

  const expectedExpiresPages =
    expectedExpiresCount === 0 ? 0 : Math.ceil(expectedExpiresCount / limit);
  TestValidator.equals(
    "expiresAt window: pagination.pages is consistent with records and limit",
    expiresPagination1.pages,
    expectedExpiresPages,
  );

  for (const summary of expiresPage1.data) {
    TestValidator.predicate(
      "expiresAt window: first page summary.expires_at within range",
      summary.expires_at >= expiresFrom && summary.expires_at <= expiresTo,
    );
  }

  if (expiresPagination1.pages >= 2) {
    const expiresPage2 = await searchByExpires(2);
    const expiresPagination2 = expiresPage2.pagination;

    TestValidator.equals(
      "expiresAt window: pagination.current is 2 on second page",
      expiresPagination2.current,
      2,
    );

    const expiresPage1Ids = new Set(expiresPage1.data.map((s) => s.id));
    const expiresPage2Ids = new Set(expiresPage2.data.map((s) => s.id));

    for (const summary of expiresPage2.data) {
      TestValidator.predicate(
        "expiresAt window: second page summary.expires_at within range",
        summary.expires_at >= expiresFrom && summary.expires_at <= expiresTo,
      );
    }

    for (const id of expiresPage2Ids) {
      TestValidator.predicate(
        "expiresAt window: page1 and page2 IDs are disjoint",
        !expiresPage1Ids.has(id),
      );
    }
  }
}

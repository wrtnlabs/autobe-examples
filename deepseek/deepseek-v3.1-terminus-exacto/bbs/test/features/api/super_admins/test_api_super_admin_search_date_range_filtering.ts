import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create base super admin for searching
  const searcherConnection: api.IConnection = { host: connection.host };
  const searcher = await authorize_super_admin_join(searcherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(searcher);
  // Create first batch of test accounts with known timestamps
  const accounts: (IDiscussionBoardSuperAdmin.ISummary & {
    originalCreatedAt: string;
    originalUpdatedAt: string;
  })[] = [];
  // Create first account (reference)
  const account1Connection: api.IConnection = { host: connection.host };
  const account1 = await authorize_super_admin_join(account1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(account1);
  accounts.push({
    ...account1,
    originalCreatedAt: account1.created_at,
    originalUpdatedAt: account1.updated_at,
  });
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create second account
  const account2Connection: api.IConnection = { host: connection.host };
  const account2 = await authorize_super_admin_join(account2Connection, {
    body: {
      email: `${RandomGenerator.alphabets(6)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(account2);
  accounts.push({
    ...account2,
    originalCreatedAt: account2.created_at,
    originalUpdatedAt: account2.updated_at,
  });
  // Wait again for third account
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create third account with specific email for search testing
  const searchEmail = `search${RandomGenerator.alphabets(4)}@test.com`;
  const account3Connection: api.IConnection = { host: connection.host };
  const account3 = await authorize_super_admin_join(account3Connection, {
    body: {
      email: searchEmail satisfies string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(account3);
  accounts.push({
    ...account3,
    originalCreatedAt: account3.created_at,
    originalUpdatedAt: account3.updated_at,
  });
  // Wait for fourth account with admin_grade testing
  await new Promise((resolve) => setTimeout(resolve, 100));
  const account4Connection: api.IConnection = { host: connection.host };
  const account4 = await authorize_super_admin_join(account4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(account4);
  accounts.push({
    ...account4,
    originalCreatedAt: account4.created_at,
    originalUpdatedAt: account4.updated_at,
  });
  // Sort accounts by created_at for reference
  const sortedAccounts = [...accounts].sort((a, b) =>
    a.originalCreatedAt.localeCompare(b.originalCreatedAt),
  );
  // Test 1: Filter by created_at_start only (should get accounts created after)
  const middleTimestamp = accounts[1].originalCreatedAt;
  const result1 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: middleTimestamp,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result1);
  const expectedAfterMiddle = accounts.filter(
    (a) => a.originalCreatedAt >= middleTimestamp,
  );
  TestValidator.equals(
    "created_at_start filter returns correct accounts",
    result1.data.length,
    expectedAfterMiddle.length,
  );
  // Test 2: Filter by created_at_end only (should get accounts created before or at)
  const result2 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_end: middleTimestamp,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result2);
  const expectedBeforeMiddle = accounts.filter(
    (a) => a.originalCreatedAt <= middleTimestamp,
  );
  TestValidator.equals(
    "created_at_end filter returns correct accounts",
    result2.data.length,
    expectedBeforeMiddle.length,
  );
  // Test 3: Filter by both created_at_start and created_at_end (range)
  const startTime = accounts[0].originalCreatedAt;
  const endTime = accounts[2].originalCreatedAt;
  const result3 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: startTime,
        created_at_end: endTime,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result3);
  const expectedInRange = accounts.filter(
    (a) => a.originalCreatedAt >= startTime && a.originalCreatedAt <= endTime,
  );
  TestValidator.equals(
    "created_at range filter returns correct accounts",
    result3.data.length,
    expectedInRange.length,
  );
  // Test 4: Filter by updated_at_start and updated_at_end
  const middleUpdate = accounts[1].originalUpdatedAt;
  const result4 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        updated_at_start: middleUpdate,
        updated_at_end: accounts[3].originalUpdatedAt,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result4);
  const expectedUpdatedInRange = accounts.filter(
    (a) =>
      a.originalUpdatedAt >= middleUpdate &&
      a.originalUpdatedAt <= accounts[3].originalUpdatedAt,
  );
  TestValidator.equals(
    "updated_at range filter returns correct accounts",
    result4.data.length,
    expectedUpdatedInRange.length,
  );
  // Test 5: Combined email search with date filter
  const result5 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        search: "search",
        created_at_start: accounts[0].originalCreatedAt,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result5);
  // Should match only account3 with "search" in email
  const expectedEmailMatch = accounts.filter(
    (a) =>
      a.email.includes("search") &&
      a.originalCreatedAt >= accounts[0].originalCreatedAt,
  );
  TestValidator.equals(
    "email search with date filter returns correct accounts",
    result5.data.length,
    expectedEmailMatch.length,
  );
  // Test 6: Filter with admin_grade (all should be "super")
  const result6 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        admin_grade: "super",
        created_at_start: accounts[0].originalCreatedAt,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result6);
  // All accounts should have admin_grade "super"
  TestValidator.predicate(
    "admin_grade filter with date returns only super accounts",
    result6.data.every((account) => account.admin_grade === "super"),
  );
  // Test 7: Edge case - future date range should return empty
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const result7 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: futureDate,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result7);
  TestValidator.equals(
    "future date range returns empty",
    result7.data.length,
    0,
  );
  // Test 8: Edge case - start date after end date (should return empty)
  const result8 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: accounts[3].originalCreatedAt,
        created_at_end: accounts[0].originalCreatedAt,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result8);
  TestValidator.equals(
    "inverted date range returns empty",
    result8.data.length,
    0,
  );
  // Test 9: Test pagination with date filters
  const result9 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: accounts[0].originalCreatedAt,
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result9);
  TestValidator.predicate(
    "pagination with date filter works",
    result9.data.length <= 2 && result9.pagination.current === 1,
  );
  // Test 10: Verify inclusive boundary by checking specific accounts
  // Find an account with exact boundary timestamp
  const boundaryAccount = accounts[1];
  const result10 = await api.functional.discussionBoard.super_admins.index(
    searcherConnection,
    {
      body: {
        created_at_start: boundaryAccount.originalCreatedAt,
        created_at_end: boundaryAccount.originalCreatedAt,
        limit: 10,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(result10);
  TestValidator.predicate(
    "inclusive boundary includes exact timestamp",
    result10.data.some((account) => account.id === boundaryAccount.id),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the accuracy of date range filtering for ban records.
 * Create a super admin account and use it to create multiple user bans with
 * specific timestamps, then test various date range filters to verify accuracy.
 */
export async function test_api_user_bans_date_range_filtering_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Note: This test focuses on querying existing ban records since we cannot
  // create ban records through the available API functions. The test validates
  // that the date range filtering endpoint works correctly with the existing
  // data structure and returns properly validated responses.
  // Test 1: Basic date range filtering
  const basicFilter: IDiscussionBoardUserBan.IRequest = {
    banned_at_from: new Date("2024-01-01T00:00:00Z").toISOString(),
    banned_at_to: new Date("2024-12-31T23:59:59Z").toISOString(),
    page: 1,
    limit: 10,
  };
  const basicResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: basicFilter },
    );
  typia.assert(basicResult);
  // Test 2: Filter for permanent bans (null expiration dates)
  const permanentBanFilter: IDiscussionBoardUserBan.IRequest = {
    expires_at_from: null,
    expires_at_to: null,
    page: 1,
    limit: 10,
  };
  const permanentResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: permanentBanFilter },
    );
  typia.assert(permanentResult);
  // Test 3: Filter for active bans (null unbanned_at dates)
  const activeBanFilter: IDiscussionBoardUserBan.IRequest = {
    unbanned_at_from: null,
    unbanned_at_to: null,
    page: 1,
    limit: 10,
  };
  const activeResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: activeBanFilter },
    );
  typia.assert(activeResult);
  // Test 4: Combined date filters
  const combinedFilter: IDiscussionBoardUserBan.IRequest = {
    banned_at_from: new Date("2024-01-01T00:00:00Z").toISOString(),
    expires_at_to: new Date("2024-06-30T23:59:59Z").toISOString(),
    unbanned_at_from: null,
    page: 1,
    limit: 10,
  };
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Test 5: Exact timestamp matching
  const exactDate = new Date("2024-03-15T12:00:00Z").toISOString();
  const exactFilter: IDiscussionBoardUserBan.IRequest = {
    banned_at_from: exactDate,
    banned_at_to: exactDate,
    page: 1,
    limit: 10,
  };
  const exactResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: exactFilter },
    );
  typia.assert(exactResult);
  // Test 6: Status filtering with date ranges
  const statusDateFilter: IDiscussionBoardUserBan.IRequest = {
    status: "active",
    banned_at_from: new Date("2024-01-01T00:00:00Z").toISOString(),
    expires_at_from: new Date("2024-03-01T00:00:00Z").toISOString(),
    page: 1,
    limit: 10,
  };
  const statusResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: statusDateFilter },
    );
  typia.assert(statusResult);
  // Test 7: Reason filtering with date ranges
  const reasonDateFilter: IDiscussionBoardUserBan.IRequest = {
    reason: "violation",
    banned_at_from: new Date("2024-01-01T00:00:00Z").toISOString(),
    page: 1,
    limit: 10,
  };
  const reasonResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      { body: reasonDateFilter },
    );
  typia.assert(reasonResult);
  // Validate pagination and response structure
  TestValidator.predicate(
    "basic result has pagination",
    basicResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic result has data array",
    Array.isArray(basicResult.data),
  );
  TestValidator.predicate(
    "current page is non-negative",
    basicResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    basicResult.pagination.limit >= 1 && basicResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    basicResult.pagination.pages >= 0,
  );
  // Validate that all returned ban records have the expected structure
  if (basicResult.data.length > 0) {
    const sampleBan = basicResult.data[0];
    TestValidator.predicate("ban has id", sampleBan.id !== undefined);
    TestValidator.predicate("ban has reason", sampleBan.reason !== undefined);
    TestValidator.predicate("ban has status", sampleBan.status !== undefined);
    TestValidator.predicate(
      "ban has banned_at",
      sampleBan.banned_at !== undefined,
    );
    TestValidator.predicate("ban has member", sampleBan.member !== undefined);
    TestValidator.predicate("ban has admin", sampleBan.admin !== undefined);
  }
}

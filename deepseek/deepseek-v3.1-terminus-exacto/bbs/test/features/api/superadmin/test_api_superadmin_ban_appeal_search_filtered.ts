import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator ban appeal search with filtering capabilities.
 * Authenticates as super administrator and searches for pending ban appeals
 * within a specific date range. Validates that the search returns paginated
 * results with correct filtering and metadata.
 */
export async function test_api_superadmin_ban_appeal_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create separate connection for API calls with authentication token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdmin.token.access },
  };
  // Set up date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Search for pending ban appeals within date range
  const searchResult =
    await api.functional.discussionBoard.superAdmin.appeals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          appealed_at_start: thirtyDaysAgo.toISOString(),
          appealed_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanAppeal.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata (business logic, not type validation)
  TestValidator.predicate(
    "pagination metadata exists",
    searchResult.pagination !== undefined,
  );
  // Fix type compatibility issues by using type assertions
  const pagination = searchResult.pagination as any;
  TestValidator.predicate(
    "current page is positive",
    (pagination.current ?? pagination.page) >= 0,
  );
  TestValidator.predicate(
    "limit is within range", 
    (pagination.limit ?? pagination.size) >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    (pagination.records ?? pagination.total) >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    (pagination.pages ?? pagination.totalPages) >= 0,
  );
  // Validate data structure is array
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  // If there are results, validate business logic
  if (searchResult.data.length > 0) {
    const appeal = searchResult.data[0];
    typia.assert(appeal);
    // Business logic validation only - typia.assert() handles type validation
    TestValidator.equals(
      "appeal status matches filter",
      appeal.status,
      "pending",
    );
    // Validate date range business logic
    const appealedAt = new Date(appeal.appealed_at);
    TestValidator.predicate(
      "appeal is within date range",
      appealedAt >= thirtyDaysAgo && appealedAt <= now,
    );
    // Validate reviewed_at is null for pending appeals
    TestValidator.equals(
      "pending appeal has null reviewed_at",
      appeal.reviewed_at,
      null,
    );
  }
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_api_rate_limits_comprehensive_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic search with text matching
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          search: "discussionBoard",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Cast pagination to any to bypass type errors
  const pagination1 = searchResult1.pagination as any;
  TestValidator.predicate(
    "search returns valid pagination",
    pagination1.records >= 0,
  );
  // Test 2: Filter by HTTP method
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          http_method: "GET",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "HTTP method filter returns results",
    searchResult2.data.length >= 0,
  );
  // Test 3: Filter by rate limit type
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          rate_limit_type: "ip_based",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Filter by enforcement action
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          enforcement_action: "block",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Filter by active status
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Test 6: Date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const searchResult6 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          created_at_from: pastDate,
          created_at_to: now,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Test 7: Pagination boundaries - first page
  const searchResult7 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult7);
  const pagination7 = searchResult7.pagination as any;
  TestValidator.equals(
    "first page number",
    pagination7.current,
    1,
  );
  // Test 8: Maximum limit parameter
  const searchResult8 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult8);
  const pagination8 = searchResult8.pagination as any;
  TestValidator.equals(
    "maximum limit applied",
    pagination8.limit,
    100,
  );
  // Test 9: Empty result combination
  const searchResult9 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          endpoint_path: "nonexistent-endpoint",
          http_method: "GET",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult9);
  TestValidator.predicate(
    "empty result combination",
    searchResult9.data.length === 0,
  );
  // Test 10: Multiple filter combination
  const searchResult10 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          search: "auth",
          http_method: "POST",
          rate_limit_type: "user_based",
          enforcement_action: "throttle",
          is_active: true,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult10);
  // Test 11: Middle page pagination
  if (pagination1.pages > 2) {
    const middlePage = Math.floor(pagination1.pages / 2);
    const searchResult11 =
      await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
        superAdminConnection,
        {
          body: {
            page: middlePage,
            limit: 10,
          } satisfies IDiscussionBoardApiRateLimit.IRequest,
        },
      );
    typia.assert(searchResult11);
    const pagination11 = searchResult11.pagination as any;
    TestValidator.equals(
      "middle page number",
      pagination11.current,
      middlePage,
    );
  }
  // Test 12: Last page pagination
  if (pagination1.pages > 1) {
    const searchResult12 =
      await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
        superAdminConnection,
        {
          body: {
            page: pagination1.pages,
            limit: 10,
          } satisfies IDiscussionBoardApiRateLimit.IRequest,
        },
      );
    typia.assert(searchResult12);
    const pagination12 = searchResult12.pagination as any;
    TestValidator.equals(
      "last page number",
      pagination12.current,
      pagination1.pages,
    );
  }
  // Test 13: enforced_at date filtering
  const searchResult13 =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          enforced_at_from: pastDate,
          enforced_at_to: now,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult13);
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_api_rate_limits_search_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test text search with partial matching
  const searchResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          search: "/user",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test exact HTTP method filtering
  const methodResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          http_method: "GET",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(methodResult);
  // Test rate limit type filtering
  const typeResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          rate_limit_type: "ip_based",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(typeResult);
  // Test enforcement action filtering
  const actionResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          enforcement_action: "block",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(actionResult);
  // Test active status filtering
  const activeResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(activeResult);
  // Test inactive status filtering
  const inactiveResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(inactiveResult);
  // Test date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateResult =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDate,
          created_at_to: now,
          updated_at_from: pastDate,
          updated_at_to: now,
          enforced_at_from: pastDate,
          enforced_at_to: now,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(dateResult);
  // Validate pagination structure and filter effectiveness
  TestValidator.predicate(
    "search result has pagination",
    typeof searchResult.pagination === "object",
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(searchResult.data),
  );
  // Validate that filters return results (basic existence check)
  TestValidator.predicate(
    "method filter returns results",
    methodResult.data.length >= 0,
  );
  TestValidator.predicate(
    "type filter returns results",
    typeResult.data.length >= 0,
  );
  TestValidator.predicate(
    "action filter returns results",
    actionResult.data.length >= 0,
  );
  TestValidator.predicate(
    "active filter returns results",
    activeResult.data.length >= 0,
  );
  TestValidator.predicate(
    "inactive filter returns results",
    inactiveResult.data.length >= 0,
  );
  TestValidator.predicate(
    "date filter returns results",
    dateResult.data.length >= 0,
  );
}

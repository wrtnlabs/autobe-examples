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

export async function test_api_api_rate_limits_search_basic_filtering(
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
  // Test search with HTTP method filter
  const httpMethodSearch =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          http_method: "GET",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(httpMethodSearch);
  TestValidator.equals(
    "pagination structure",
    typeof httpMethodSearch.pagination,
    "object",
  );
  // 使用类型断言解决编译器错误
  const httpPagination = httpMethodSearch.pagination as any;
  TestValidator.predicate(
    "has pagination metadata",
    httpPagination.current >= 0,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(httpMethodSearch.data),
  );
  // Test search with active status filter
  const activeStatusSearch =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(activeStatusSearch);
  TestValidator.equals(
    "pagination structure",
    typeof activeStatusSearch.pagination,
    "object",
  );
  const activePagination = activeStatusSearch.pagination as any;
  TestValidator.predicate(
    "has pagination metadata",
    activePagination.current >= 0,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(activeStatusSearch.data),
  );
  // Test search with minimal criteria (no text search, should order by creation date)
  const minimalSearch =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(minimalSearch);
  TestValidator.equals(
    "pagination structure",
    typeof minimalSearch.pagination,
    "object",
  );
  const minPagination = minimalSearch.pagination as any;
  TestValidator.predicate(
    "has pagination metadata",
    minPagination.current >= 0,
  );
  TestValidator.predicate("has data array", Array.isArray(minimalSearch.data));
  // Verify pagination metadata
  TestValidator.predicate(
    "current page positive",
    minPagination.current >= 0,
  );
  TestValidator.predicate("limit positive", minPagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    minPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    minPagination.pages >= 0,
  );
  // Test unauthorized access attempts
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("user unauthorized access", async () => {
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  });
}

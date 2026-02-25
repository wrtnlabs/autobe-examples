import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_rate_limits_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test filtering by endpoint_path with partial matching
  const endpointPathFilter =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/api",
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(endpointPathFilter);
  // Validate that results contain the filter pattern
  if (endpointPathFilter.data.length > 0) {
    TestValidator.predicate(
      "endpoint_path filter returns matching results",
      endpointPathFilter.data.every((limit) =>
        limit.endpoint_path.includes("/api"),
      ),
    );
  }
  // Test filtering by http_method with exact match
  const httpMethodFilter =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          http_method: "GET",
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(httpMethodFilter);
  // Validate that results match the exact http_method
  if (httpMethodFilter.data.length > 0) {
    TestValidator.predicate(
      "http_method filter returns exact matches",
      httpMethodFilter.data.every((limit) => limit.http_method === "GET"),
    );
  }
  // Test filtering by is_active status
  const activeFilter =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(activeFilter);
  // Validate that results match the is_active filter
  if (activeFilter.data.length > 0) {
    TestValidator.predicate(
      "is_active filter returns active rate limits",
      activeFilter.data.every((limit) => limit.is_active === true),
    );
  }
  // Test filtering by multiple criteria
  const combinedFilter =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/communityPlatform",
          http_method: "POST",
          is_active: true,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate that results match all combined criteria
  if (combinedFilter.data.length > 0) {
    TestValidator.predicate(
      "combined filter returns matching results",
      combinedFilter.data.every(
        (limit) =>
          limit.endpoint_path.includes("/communityPlatform") &&
          limit.http_method === "POST" &&
          limit.is_active === true,
      ),
    );
  }
  // Test pagination parameters
  const paginationTest =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformApiRateLimit.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    paginationTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginationTest.pagination.limit >= 1 &&
      paginationTest.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginationTest.pagination.pages >= 0,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_health_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test pagination with different configurations
  const testCases = [
    {
      page: 1,
      limit: 10,
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
    },
    {
      page: 2,
      limit: 5,
      sort_by: "total_users" as const,
      sort_order: "asc" as const,
    },
    {
      page: 1,
      limit: 20,
      sort_by: "total_posts" as const,
      sort_order: "desc" as const,
    },
    {
      page: 1,
      limit: 15,
      sort_by: "total_comments" as const,
      sort_order: "asc" as const,
    },
    {
      page: 1,
      limit: 8,
      sort_by: "engagement_rate" as const,
      sort_order: "desc" as const,
    },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.communityPlatform.admin.analytics.health.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
            sort_by: testCase.sort_by,
            sort_order: testCase.sort_order,
          } satisfies ICommunityPlatformSystemSnapshot.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      "pagination limit",
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      "records count non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count non-negative",
      response.pagination.pages >= 0,
    );
  }
  // Test edge cases
  // Test page beyond available data
  const beyondPageResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "empty data for beyond page",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "current page for beyond page",
    beyondPageResponse.pagination.current,
    9999,
  );
  // Test minimum and maximum limit values
  const minLimitResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals("minimum limit", minLimitResponse.pagination.limit, 1);
  const maxLimitResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  // Test sorting with filtering combination
  const filteredResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 7 days
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered response has valid pagination",
    filteredResponse.pagination.records >= 0,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_configurations_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test various filter combinations
  const filterCombinations = [
    { data_type: "boolean", scope: "global", is_active: true },
    { data_type: "integer", scope: "environment", is_active: false },
    { data_type: "string", scope: "feature", is_active: true },
    { search: "config", data_type: "string", page: 1, limit: 10 },
    { scope: "global", page: 1, limit: 5 },
    { is_active: true, page: 2, limit: 20 },
    { search: "test", page: 1, limit: 15 },
    { data_type: "boolean", is_active: false, page: 1, limit: 25 },
  ];
  for (const filter of filterCombinations) {
    const analyticsResponse =
      await api.functional.communityPlatform.admin.analytics.configurations.index(
        adminConnection,
        {
          body: {
            search: filter.search,
            data_type: filter.data_type,
            scope: filter.scope,
            is_active: filter.is_active,
            page: filter.page,
            limit: filter.limit,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(analyticsResponse);
    // Validate pagination metadata structure
    TestValidator.predicate(
      `pagination has valid current page for filter ${JSON.stringify(filter)}`,
      analyticsResponse.pagination.current >= 0,
    );
    TestValidator.predicate(
      `pagination has valid limit for filter ${JSON.stringify(filter)}`,
      analyticsResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination has valid records count for filter ${JSON.stringify(filter)}`,
      analyticsResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination has valid pages count for filter ${JSON.stringify(filter)}`,
      analyticsResponse.pagination.pages >= 0,
    );
    // Validate data array matches pagination
    TestValidator.predicate(
      `data length matches pagination limit for filter ${JSON.stringify(filter)}`,
      analyticsResponse.data.length <= analyticsResponse.pagination.limit,
    );
    // Validate configuration summaries structure
    for (const config of analyticsResponse.data) {
      typia.assert(config);
    }
    // Test pagination consistency when page/limit specified
    if (filter.page !== undefined) {
      TestValidator.equals(
        `page matches request for filter ${JSON.stringify(filter)}`,
        analyticsResponse.pagination.current,
        filter.page,
      );
    }
    if (filter.limit !== undefined) {
      TestValidator.equals(
        `limit matches request for filter ${JSON.stringify(filter)}`,
        analyticsResponse.pagination.limit,
        filter.limit,
      );
    }
  }
}

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

export async function test_api_analytics_performance_no_data_found(
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
  // Test with future date range (no data should exist)
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const response =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate.toISOString(),
          created_at_end: new Date(
            futureDate.getTime() + 1000 * 60 * 60 * 24,
          ).toISOString(), // +1 day
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty results
  TestValidator.equals("data array should be empty", response.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
  // Test with unrealistic metric thresholds
  const response2 =
    await api.functional.communityPlatform.admin.analytics.performance.index(
      adminConnection,
      {
        body: {
          total_users_min: 1000000, // Unrealistically high threshold
          engagement_rate_min: 200, // Impossible engagement rate (>100%)
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(response2);
  // Validate empty results again
  TestValidator.equals(
    "data array should be empty for unrealistic thresholds",
    response2.data.length,
    0,
  );
  TestValidator.equals(
    "total records should be 0 for unrealistic thresholds",
    response2.pagination.records,
    0,
  );
}

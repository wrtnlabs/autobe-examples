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

export async function test_api_admin_analytics_pagination_validation(
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
  // Get analytics data with default pagination
  const analyticsPage =
    await api.functional.communityPlatform.admin.analytics.index(
      adminConnection,
    );
  typia.assert(analyticsPage);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure has required fields",
    Object.keys(analyticsPage.pagination),
    ["current", "limit", "records", "pages"],
  );
  // Validate pagination calculations
  const { pagination } = analyticsPage;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);
  // Validate pagination calculation logic
  if (pagination.limit > 0) {
    TestValidator.equals(
      "pages calculation: ceil(records / limit)",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  } else {
    TestValidator.equals(
      "pages should be 0 when limit is 0",
      pagination.pages,
      0,
    );
  }
  // Validate data structure consistency
  TestValidator.predicate(
    "data array exists",
    Array.isArray(analyticsPage.data),
  );
  // Validate individual snapshot structure if data exists
  if (analyticsPage.data.length > 0) {
    const snapshot = analyticsPage.data[0];
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has required fields",
      snapshot.id && snapshot.created_at && snapshot.total_users !== undefined,
    );
    TestValidator.predicate(
      "engagement rate is valid",
      snapshot.engagement_rate >= 0 && snapshot.engagement_rate <= 1,
    );
  }
  // Test boundary condition: empty data set
  if (pagination.records === 0) {
    TestValidator.equals(
      "empty data set should have empty data array",
      analyticsPage.data.length,
      0,
    );
    TestValidator.equals(
      "empty data set should have 0 pages",
      pagination.pages,
      0,
    );
  }
}

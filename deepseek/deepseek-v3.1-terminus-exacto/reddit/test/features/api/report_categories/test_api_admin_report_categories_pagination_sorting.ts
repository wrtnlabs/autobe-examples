import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_categories_pagination_sorting(
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
  // Test default pagination (page 1, limit 10)
  const defaultPage =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination metadata
  TestValidator.equals("current page", defaultPage.pagination.current, 1);
  TestValidator.equals("page limit", defaultPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
  // Test pagination with different page sizes
  const pageSize5 =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(pageSize5);
  TestValidator.equals("page size 5 limit", pageSize5.pagination.limit, 5);
  // Test sorting by name ascending
  const nameAsc =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(nameAsc);
  // Test sorting by severity_level descending
  const severityDesc =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          sort_by: "severity_level",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(severityDesc);
  // Test default sorting (created_at descending)
  const defaultSort =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(defaultSort);
  // Test pagination beyond available pages
  const highPage =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(highPage);
  TestValidator.equals("empty data on high page", highPage.data.length, 0);
  TestValidator.predicate(
    "current page should be high page",
    highPage.pagination.current >= 999,
  );
  // Test minimum limit
  const minLimit =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("minimum limit", minLimit.pagination.limit, 1);
  TestValidator.predicate(
    "data length at most limit",
    minLimit.data.length <= 1,
  );
}

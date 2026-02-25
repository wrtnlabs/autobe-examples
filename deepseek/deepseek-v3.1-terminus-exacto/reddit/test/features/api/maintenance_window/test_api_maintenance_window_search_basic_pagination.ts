import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMaintenanceWindow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_window_search_basic_pagination(
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
  // Test first page with minimal parameters
  const page1 =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // Validate data structure
  if (page1.data.length > 0) {
    const firstItem = page1.data[0];
    TestValidator.predicate("has id", firstItem.id !== undefined);
    TestValidator.predicate("has title", firstItem.title !== undefined);
    TestValidator.predicate(
      "has maintenance_type",
      firstItem.maintenance_type !== undefined,
    );
    TestValidator.predicate(
      "has scheduled_start",
      firstItem.scheduled_start !== undefined,
    );
    TestValidator.predicate(
      "has scheduled_end",
      firstItem.scheduled_end !== undefined,
    );
    TestValidator.predicate("has status", firstItem.status !== undefined);
    TestValidator.predicate(
      "has impact_level",
      firstItem.impact_level !== undefined,
    );
  }
  // Test second page if available
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.communityPlatform.admin.maintenance_windows.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current page", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
    TestValidator.equals(
      "total records consistent",
      page2.pagination.records,
      page1.pagination.records,
    );
  }
  // Test with different limit
  const pageWithLimit5 =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(pageWithLimit5);
  TestValidator.equals(
    "limit 5 current page",
    pageWithLimit5.pagination.current,
    1,
  );
  TestValidator.equals("limit 5 limit", pageWithLimit5.pagination.limit, 5);
  TestValidator.predicate(
    "data length <= limit",
    pageWithLimit5.data.length <= 5,
  );
}

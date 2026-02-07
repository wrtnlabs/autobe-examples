import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_schedules_pagination_with_impact_level(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Test pagination with specific impact level filtering
  const targetImpactLevel = "high";
  const limit = 3;
  // Get first page
  const page1 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          impact_level: targetImpactLevel,
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);
  TestValidator.equals(
    "limit should match request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    page1.pagination.pages >= 0,
  );
  // Validate data count matches limit (except possibly last page)
  TestValidator.predicate(
    "data count should be <= limit",
    page1.data.length <= limit,
  );
  // Validate all items have the target impact level (if any data returned)
  if (page1.data.length > 0) {
    page1.data.forEach((item, index) => {
      TestValidator.equals(
        `item ${index} should have target impact level`,
        item.impact_level,
        targetImpactLevel,
      );
    });
  }
  // Get second page if available
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.discussionBoard.admin.maintenance_schedules.index(
        adminConnection,
        {
          body: {
            impact_level: targetImpactLevel,
            page: 2,
            limit: limit,
          } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
        },
      );
    typia.assert(page2);
    // Validate pagination metadata consistency
    TestValidator.equals(
      "current page should be 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "limit should be consistent",
      page2.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "total records should be consistent",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "total pages should be consistent",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    // Validate data count
    TestValidator.predicate(
      "page 2 data count should be <= limit",
      page2.data.length <= limit,
    );
    // Validate all items have the target impact level (if any data returned)
    if (page2.data.length > 0) {
      page2.data.forEach((item, index) => {
        TestValidator.equals(
          `page 2 item ${index} should have target impact level`,
          item.impact_level,
          targetImpactLevel,
        );
      });
    }
  }
  // Test with different limit
  const differentLimit = 5;
  const pageWithDifferentLimit =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          impact_level: targetImpactLevel,
          page: 1,
          limit: differentLimit,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(pageWithDifferentLimit);
  TestValidator.equals(
    "limit should match new request",
    pageWithDifferentLimit.pagination.limit,
    differentLimit,
  );
}

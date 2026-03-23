import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLogChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_activity_log_changes_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test activity log changes pagination and sorting behavior.
   * 1. Admin authenticates to access activity logs
   * 2. Create contract to generate activity log with multiple field changes
   * 3. Create timesheet to generate additional activity log
   * 4. Update timesheet to generate approval activity log
   * 5. Retrieve activity log changes with various pagination parameters
   * 6. Validate pagination metadata and sorting order
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create contract to generate activity log with multiple field changes
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {},
  );
  typia.assert(contract);
  // 3. Create timesheet to generate additional activity log
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Update timesheet to generate approval activity log
  const updatedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.update(adminConnection, {
      timesheetId: timesheet.id,
      body: {} satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(updatedTimesheet);
  // 5. Retrieve activity log changes with default pagination (page 1, limit 20)
  const page1Result =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(page1Result);
  // Validate page 1 pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 has records",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has pages",
    page1Result.pagination.pages >= 0,
  );
  // 6. Retrieve with custom limit (50 records per page)
  const page1Limit50 =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(page1Limit50);
  TestValidator.equals(
    "limit 50 current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals("limit 50 limit", page1Limit50.pagination.limit, 50);
  // 7. Retrieve with maximum limit (100 records per page)
  const page1Limit100 =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "limit 100 current page",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals("limit 100 limit", page1Limit100.pagination.limit, 100);
  // 8. Test pagination with page 2 (if records exist)
  if (page1Result.pagination.pages >= 2) {
    const page2Result =
      await api.functional.hrmPlatform.admin.activity_logs.changes.index(
        adminConnection,
        {
          activityLogId: timesheet.id,
          body: {
            page: 2,
            limit: 20,
          } satisfies IHrmPlatformActivityLogChange.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
  }
  // 9. Verify sorting order (created_at descending - newest first)
  if (page1Result.data.length >= 2) {
    const firstChange = page1Result.data[0];
    const secondChange = page1Result.data[1];
    TestValidator.predicate(
      "changes sorted by created_at descending",
      new Date(firstChange.created_at).getTime() >=
        new Date(secondChange.created_at).getTime(),
    );
  }
  // 10. Test with field_name filter
  const filteredByName =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 20,
          field_name: "status",
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(filteredByName);
  TestValidator.equals(
    "filtered page current",
    filteredByName.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page limit",
    filteredByName.pagination.limit,
    20,
  );
  // 11. Test with field_type filter
  const filteredByType =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 20,
          field_type: "string",
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(filteredByType);
  TestValidator.equals(
    "type filtered current",
    filteredByType.pagination.current,
    1,
  );
  TestValidator.equals(
    "type filtered limit",
    filteredByType.pagination.limit,
    20,
  );
  // 12. Test empty result set (filter that returns no matches)
  const emptyResult =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId: timesheet.id,
        body: {
          page: 1,
          limit: 20,
          field_name: "nonexistent_field_xyz",
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 20);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // 13. Validate pagination calculation: pages = ceil(records / limit)
  const totalRecords = page1Limit100.pagination.records;
  const totalPages = page1Limit100.pagination.pages;
  const expectedPages = Math.ceil(totalRecords / 100);
  TestValidator.equals(
    "pagination pages calculation",
    totalPages,
    expectedPages,
  );
  // 14. Test last page has fewer or equal records than limit
  if (totalPages > 1) {
    const lastPage =
      await api.functional.hrmPlatform.admin.activity_logs.changes.index(
        adminConnection,
        {
          activityLogId: timesheet.id,
          body: {
            page: totalPages,
            limit: 20,
          } satisfies IHrmPlatformActivityLogChange.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current",
      lastPage.pagination.current,
      totalPages,
    );
    TestValidator.predicate(
      "last page data count <= limit",
      lastPage.data.length <= 20,
    );
  }
  // 15. Verify change data structure
  if (page1Result.data.length > 0) {
    const sampleChange = page1Result.data[0];
    TestValidator.predicate("change has id", sampleChange.id !== undefined);
    TestValidator.predicate(
      "change has field_name",
      sampleChange.field_name !== undefined,
    );
    TestValidator.predicate(
      "change has field_type",
      sampleChange.field_type !== undefined,
    );
    TestValidator.predicate(
      "change has created_at",
      sampleChange.created_at !== undefined,
    );
    TestValidator.predicate(
      "change has activityLog",
      sampleChange.activityLog !== undefined,
    );
    // old_value and new_value can be null
    TestValidator.predicate(
      "change has old_value or null",
      sampleChange.old_value === null ||
        typeof sampleChange.old_value === "string",
    );
    TestValidator.predicate(
      "change has new_value or null",
      sampleChange.new_value === null ||
        typeof sampleChange.new_value === "string",
    );
  }
}

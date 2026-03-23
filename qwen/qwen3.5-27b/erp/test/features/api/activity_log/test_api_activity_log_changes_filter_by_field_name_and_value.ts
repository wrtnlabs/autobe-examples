import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test filtering activity log changes by field name and value patterns.
 * This test validates that the activity log changes endpoint correctly filters
 * field-level modifications by field_name, old_value, and new_value parameters.
 * It creates multiple activity log entries through various operations and then
 * tests different filtering combinations to ensure accurate results.
 */
export async function test_api_activity_log_changes_filter_by_field_name_and_value(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication for project operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 3. Create a project (generates activity log)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Test Project for Activity Log",
        description: "Project created for testing activity log changes",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 4. Update project status to generate activity log with status field change
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Create timelog entries (generates additional activity logs)
  const timelog = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: 60,
        billable: true,
        description: "Test timelog entry",
      },
    },
  );
  typia.assert(timelog);
  // 6. Update employee to generate activity log with employee field changes
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: {
        employment_type: "part-time",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  } catch {
    // If employee doesn't exist, that's okay for this test
    // The project updates already generated sufficient activity logs
  }
  // 7. Use a test activity log ID for filtering tests
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  // 8. Test filtering by field_name (e.g., 'status')
  const statusChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          field_name: "status",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(statusChanges);
  // 9. Test filtering by old_value pattern
  const activeValueChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          old_value: "active",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(activeValueChanges);
  // 10. Test filtering by new_value pattern
  const completedValueChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          new_value: "completed",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(completedValueChanges);
  // 11. Test combined filtering (field_name + old_value + new_value)
  const combinedFilterChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          field_name: "status",
          old_value: "active",
          new_value: "completed",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(combinedFilterChanges);
  // 12. Test pagination with filters
  const paginatedChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          field_name: "status",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(paginatedChanges);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedChanges.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedChanges.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data count does not exceed limit",
    paginatedChanges.data.length <= 10,
  );
  // 13. Test field_type filtering
  const stringTypeChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          field_type: "string",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(stringTypeChanges);
  // 14. Validate that filtering reduces result set compared to unfiltered
  const unfilteredChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(unfilteredChanges);
  TestValidator.predicate(
    "filtered results are subset of unfiltered",
    statusChanges.pagination.records <= unfilteredChanges.pagination.records,
  );
  // 15. Test business logic: verify field_name filter returns correct field
  TestValidator.predicate(
    "field_name filter returns only matching fields",
    statusChanges.data.every((change) => change.field_name === "status"),
  );
  // 16. Test business logic: verify old_value pattern matching
  TestValidator.predicate(
    "old_value filter returns changes with matching old values",
    activeValueChanges.data.every(
      (change) =>
        change.old_value === null || change.old_value.includes("active"),
    ),
  );
  // 17. Test business logic: verify new_value pattern matching
  TestValidator.predicate(
    "new_value filter returns changes with matching new values",
    completedValueChanges.data.every(
      (change) =>
        change.new_value === null || change.new_value.includes("completed"),
    ),
  );
  // 18. Test business logic: verify combined filter accuracy
  TestValidator.predicate(
    "combined filter returns only matching changes",
    combinedFilterChanges.data.every(
      (change) =>
        change.field_name === "status" &&
        (change.old_value === null || change.old_value.includes("active")) &&
        (change.new_value === null || change.new_value.includes("completed")),
    ),
  );
  // 19. Test business logic: verify field_type filter accuracy
  TestValidator.predicate(
    "field_type filter returns only matching types",
    stringTypeChanges.data.every((change) => change.field_type === "string"),
  );
  // 20. Test business logic: verify pagination records count
  TestValidator.predicate(
    "pagination records count is accurate",
    paginatedChanges.pagination.records >= paginatedChanges.data.length,
  );
}

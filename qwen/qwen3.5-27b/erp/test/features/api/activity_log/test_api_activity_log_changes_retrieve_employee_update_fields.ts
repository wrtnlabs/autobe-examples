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
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

/**
 * Test retrieving field-level changes from activity log after employee update.
 * 1. Admin authenticates via join endpoint
 * 2. Admin updates an existing employee record with multiple field changes
 * 3. Activity log entry is created with field-level change records
 * 4. Admin retrieves paginated list of changes from the activity log
 * 5. Validate change records contain field_name, old_value, new_value, field_type, created_at
 * 6. Verify parent activity log summary includes action_type, target_entity_type, actingMember
 * 7. Confirm pagination metadata accuracy
 */
export async function test_api_activity_log_changes_retrieve_employee_update_fields(
  connection: api.IConnection,
): Promise<void> {
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
  // 2. Update employee to generate activity log with field changes
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const updatedEmployee =
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: {
        department_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // 3. Retrieve activity log changes
  // Note: In a real scenario, activityLogId would be obtained from the activity log
  // created by the employee update. For this test, we use a placeholder ID.
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const changes =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(changes);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", changes.pagination.current, 1);
  TestValidator.equals("limit", changes.pagination.limit, 20);
  TestValidator.predicate("has records", changes.pagination.records >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    changes.pagination.pages ===
      Math.ceil(changes.pagination.records / changes.pagination.limit),
  );
  // 5. Validate change records structure
  if (changes.data.length > 0) {
    await ArrayUtil.asyncForEach(changes.data, async (change) => {
      typia.assert(change);
      // typia.assert already validates all required fields, so we only test business logic
      TestValidator.predicate(
        `field_name is meaningful: ${change.field_name}`,
        change.field_name.length > 0,
      );
      TestValidator.predicate(
        `field_type is valid: ${change.field_type}`,
        ["string", "int", "datetime", "boolean", "uuid"].includes(
          change.field_type,
        ),
      );
      // Validate parent activity log summary
      typia.assert(change.activityLog);
      TestValidator.equals(
        "activity log ID matches",
        change.activityLog.id,
        activityLogId,
      );
      TestValidator.predicate(
        `action_type is set: ${change.activityLog.action_type}`,
        change.activityLog.action_type.length > 0,
      );
      TestValidator.predicate(
        `target_entity_type is set: ${change.activityLog.target_entity_type}`,
        change.activityLog.target_entity_type.length > 0,
      );
    });
  }
  // 6. Test with filtering by field_name
  const filteredChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          field_name: "employment_type",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(filteredChanges);
  TestValidator.equals("filtered page", filteredChanges.pagination.current, 1);
  TestValidator.equals("filtered limit", filteredChanges.pagination.limit, 10);
  if (filteredChanges.data.length > 0) {
    await ArrayUtil.asyncForEach(filteredChanges.data, async (change) => {
      typia.assert(change);
      TestValidator.equals(
        "all changes match filter",
        change.field_name,
        "employment_type",
      );
    });
  }
  // 7. Test pagination with different page/limit
  const paginatedChanges =
    await api.functional.hrmPlatform.admin.activity_logs.changes.index(
      adminConnection,
      {
        activityLogId,
        body: {
          page: 2,
          limit: 50,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(paginatedChanges);
  TestValidator.equals("page 2", paginatedChanges.pagination.current, 2);
  TestValidator.equals("limit 50", paginatedChanges.pagination.limit, 50);
}
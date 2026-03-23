import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test retrieving activity log entries and validating department creation audit trail.
 * 1. Admin authenticates to the system
 * 2. Admin creates a department, which generates an activity log entry
 * 3. Retrieve activity logs and verify the department creation entry exists
 * 4. Validate the activity log contains accurate audit information
 *
 * Note: Field-level change retrieval is not tested because the available APIs
 * require a known changeId which cannot be obtained from the activity log summary.
 */
export async function test_api_activity_log_change_retrieve_success(
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
  // 2. Create a department to generate an activity log entry
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. List activity logs to find the department creation entry
  const activityLogs =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          page_size: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogs);
  // Find the activity log related to department creation
  const departmentCreationLog = activityLogs.data.find(
    (log) => log.target_entity_type === "department",
  );
  if (!departmentCreationLog)
    throw new Error("No department creation activity log found");
  // 4. Validate the activity log entry
  TestValidator.equals(
    "activity log has valid ID",
    typeof departmentCreationLog.id,
    "string",
  );
  TestValidator.predicate(
    "action type is present",
    departmentCreationLog.action_type.length > 0,
  );
  TestValidator.equals(
    "target entity type is department",
    departmentCreationLog.target_entity_type,
    "department",
  );
  TestValidator.equals(
    "target entity ID matches created department",
    departmentCreationLog.target_entity_id,
    department.id,
  );
  TestValidator.predicate(
    "action description is present",
    departmentCreationLog.action_description.length > 0,
  );
  TestValidator.predicate(
    "acting member is present (admin)",
    departmentCreationLog.actingMember !== null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(departmentCreationLog.created_at)),
  );
  // Note: Field-level change retrieval (GET /changes/{changeId}) requires a known
  // changeId which cannot be obtained from the available APIs. The activity log
  // summary does not include the list of changes, and there's no endpoint to
  // list changes for an activity log. This limitation prevents testing the
  // change retrieval endpoint in this E2E scenario.
}

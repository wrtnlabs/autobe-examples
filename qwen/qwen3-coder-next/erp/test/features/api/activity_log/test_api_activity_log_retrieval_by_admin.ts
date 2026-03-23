import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";

export async function test_api_activity_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create employee (triggers activity log)
  const organization = typia.random<IHrmTrackerOrganization.ISummary>();
  const employee = await generate_random_hrm_tracker_member_employees_create(
    adminConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: organization.id,
        user_id: adminUser.id,
      },
    },
  );
  typia.assert(employee);
  // 3. Retrieve activity logs to find the created log (sorted by most recent)
  const logs =
    await api.functional.hrmTracker.member.analytics.activities.index(
      adminConnection,
      {
        body: {
          target_entity_type: "employee",
          target_entity_id: employee.id,
          sort: "-created_at",
          limit: 10,
        },
      },
    );
  typia.assert(logs);
  // Find the specific activity log for this employee creation
  const activityLog = logs.data.find(
    (log) => log.target_entity_id === employee.id,
  );
  TestValidator.predicate(
    "activity log exists for employee creation",
    activityLog !== undefined,
  );
  // 4. Retrieve specific activity log by ID
  const retrievedLog = await api.functional.hrmTracker.activity_logs.at(
    adminConnection,
    {
      activityLogId: activityLog!.id,
    },
  );
  typia.assert(retrievedLog);
  // 5. Validate
  TestValidator.equals(
    "target_entity_type is employee",
    retrievedLog.target_entity_type,
    "employee",
  );
  TestValidator.equals(
    "target_entity_id matches employee ID",
    retrievedLog.target_entity_id,
    employee.id,
  );
  TestValidator.equals(
    "action_type is employee_invited",
    retrievedLog.action_type,
    "employee_invited",
  );
  // actorMember should reference the admin who performed the action
  TestValidator.equals(
    "actorMember references admin",
    retrievedLog.actorMember!.id,
    adminUser.id,
  );
  TestValidator.equals(
    "actorMember name matches admin display name",
    retrievedLog.actorMember!.display_name,
    adminUser.display_name,
  );
}

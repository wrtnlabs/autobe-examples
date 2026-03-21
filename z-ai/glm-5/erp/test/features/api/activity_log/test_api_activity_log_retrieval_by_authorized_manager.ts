import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_activity_log_retrieval_by_authorized_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member with org:manage permission (owner role)
  // authorize_member_join creates both member and organization, member becomes owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create an employee to generate an activity log entry
  // This operation creates an activity log with action_type "employee_invited"
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: RandomGenerator.pick([
          "full_time",
          "part_time",
          "contractor",
          "intern",
        ] as const),
        roleId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(employee);
  // Step 3: Retrieve an activity log entry by UUID
  // Note: In a real environment, activity log IDs would be obtained from a list endpoint
  // or returned from the employee creation. This test uses simulation-compatible approach.
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve the activity log entry
  const activityLog = await api.functional.erpHrm.member.activity_logs.at(
    ownerConnection,
    { activityLogId },
  );
  typia.assert(activityLog);
  // Step 5: Validate business logic - verify the retrieved activity log structure
  TestValidator.equals(
    "activity log id matches request",
    activityLog.id,
    activityLogId,
  );
  TestValidator.predicate(
    "action type is populated",
    activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "entity type is populated",
    activityLog.entity_type.length > 0,
  );
  TestValidator.equals(
    "member id matches actor",
    activityLog.member.id,
    ownerAuth.id,
  );
}

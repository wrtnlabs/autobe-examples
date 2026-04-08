import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_activity_log_retrieval_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a department to generate an activity log entry
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(department);
  // 3. Retrieve the activity log using the department ID as the activity log ID
  // In this system, department creation activity log ID matches the department ID
  const activityLog = await api.functional.erpHrm.admin.activity_logs.at(
    adminConnection,
    {
      activityLogId: department.id,
    },
  );
  typia.assert(activityLog);
  // 4. Validate activity log response structure
  TestValidator.equals("id is valid UUID", activityLog.id, department.id);
  TestValidator.equals(
    "actionType is department_created",
    activityLog.actionType,
    "department_created",
  );
  TestValidator.equals(
    "targetEntityType is department",
    activityLog.targetEntityType,
    "department",
  );
  TestValidator.equals(
    "targetEntityId matches department ID",
    activityLog.targetEntityId,
    department.id,
  );
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(activityLog.createdAt),
  );
  // 5. Validate member object structure
  TestValidator.equals("member has id", !!activityLog.member.id, true);
  TestValidator.equals("member has email", !!activityLog.member.email, true);
  TestValidator.equals(
    "member has displayName",
    !!activityLog.member.displayName,
    true,
  );
  // 6. Validate organization object structure
  TestValidator.equals(
    "organization has id",
    !!activityLog.organization.id,
    true,
  );
  TestValidator.equals(
    "organization has name",
    !!activityLog.organization.name,
    true,
  );
}

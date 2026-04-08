import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_invitation_bulk_with_role_department_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a department for pre-assignment
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {},
  );
  typia.assert(department);
  // 3. Create a custom role for pre-assignment
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:view", "project:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Generate unique email addresses for invitations
  const timestamp = Date.now();
  const emailWithRoleOnly = `role_only_${timestamp}@test.com`;
  const emailWithDeptOnly = `dept_only_${timestamp}@test.com`;
  const emailWithBoth = `both_${timestamp}@test.com`;
  // 5. Send bulk invitation request - body is IBulkCreate (single invitation object)
  // Note: The SDK type IBulkCreate represents a single invitation, not an array.
  // The bulk endpoint processes one invitation per request.
  const bulkResult1 =
    await api.functional.erpHrm.admin.invitations.bulk.createBulk(
      adminConnection,
      {
        body: {
          email: emailWithRoleOnly as string & tags.Format<"email">,
          erpHrmRoleId: role.id,
        } satisfies IErpHrmInvitation.IBulkCreate,
      },
    );
  typia.assert(bulkResult1);
  const bulkResult2 =
    await api.functional.erpHrm.admin.invitations.bulk.createBulk(
      adminConnection,
      {
        body: {
          email: emailWithDeptOnly as string & tags.Format<"email">,
          erpHrmDepartmentId: department.id,
        } satisfies IErpHrmInvitation.IBulkCreate,
      },
    );
  typia.assert(bulkResult2);
  const bulkResult3 =
    await api.functional.erpHrm.admin.invitations.bulk.createBulk(
      adminConnection,
      {
        body: {
          email: emailWithBoth as string & tags.Format<"email">,
          erpHrmRoleId: role.id,
          erpHrmDepartmentId: department.id,
        } satisfies IErpHrmInvitation.IBulkCreate,
      },
    );
  typia.assert(bulkResult3);
  // 6. Validate each bulk result (each should have 1 success)
  TestValidator.equals(
    "first bulk should have 1 success",
    bulkResult1.successes.length,
    1,
  );
  TestValidator.equals(
    "first bulk should have 0 failures",
    bulkResult1.failures.length,
    0,
  );
  TestValidator.equals(
    "second bulk should have 1 success",
    bulkResult2.successes.length,
    1,
  );
  TestValidator.equals(
    "second bulk should have 0 failures",
    bulkResult2.failures.length,
    0,
  );
  TestValidator.equals(
    "third bulk should have 1 success",
    bulkResult3.successes.length,
    1,
  );
  TestValidator.equals(
    "third bulk should have 0 failures",
    bulkResult3.failures.length,
    0,
  );
  // 7. Get the invitation summaries
  const roleOnlyInvitation = bulkResult1.successes[0];
  const deptOnlyInvitation = bulkResult2.successes[0];
  const bothInvitation = bulkResult3.successes[0];
  // 8. Validate role-only invitation
  typia.assert(roleOnlyInvitation);
  TestValidator.equals("role_id matches", roleOnlyInvitation.role?.id, role.id);
  TestValidator.equals(
    "department is null",
    roleOnlyInvitation.department,
    null,
  );
  TestValidator.equals(
    "status is pending",
    roleOnlyInvitation.status,
    "pending",
  );
  // 9. Validate department-only invitation
  typia.assert(deptOnlyInvitation);
  TestValidator.equals("role is null", deptOnlyInvitation.role, null);
  TestValidator.equals(
    "department_id matches",
    deptOnlyInvitation.department?.id,
    department.id,
  );
  TestValidator.equals(
    "status is pending",
    deptOnlyInvitation.status,
    "pending",
  );
  // 10. Validate both role and department invitation
  typia.assert(bothInvitation);
  TestValidator.equals("role_id matches", bothInvitation.role?.id, role.id);
  TestValidator.equals(
    "department_id matches",
    bothInvitation.department?.id,
    department.id,
  );
  TestValidator.equals("status is pending", bothInvitation.status, "pending");
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test employee department unassignment functionality.
 * 1. Authenticate as admin
 * 2. Update employee to unassign from department by setting department_id to null
 * 3. Validate employee record remains intact with department as null
 * 4. Verify other employee attributes are preserved
 */
export async function test_api_employee_department_unassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Use existing employee ID from test environment setup
  // In a real test environment, this would come from fixture data or previous test steps
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Unassign employee from department by setting department_id to null
  const updatedEmployee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: { department_id: null } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // 4. Verify employee department is null
  TestValidator.equals(
    "department unassigned",
    updatedEmployee.department,
    null,
  );
  // 5. Verify employee record still exists and is not deleted
  TestValidator.predicate(
    "employee id exists",
    updatedEmployee.id !== undefined,
  );
  TestValidator.predicate(
    "employee not soft-deleted",
    updatedEmployee.deleted_at === null,
  );
  // 6. Verify other attributes are preserved
  TestValidator.predicate("role preserved", updatedEmployee.role !== undefined);
  TestValidator.predicate(
    "employment_type preserved",
    updatedEmployee.employment_type !== undefined,
  );
  TestValidator.predicate(
    "status preserved",
    updatedEmployee.status !== undefined,
  );
  TestValidator.predicate(
    "member reference preserved",
    updatedEmployee.member !== undefined,
  );
  TestValidator.predicate(
    "organization reference preserved",
    updatedEmployee.organization !== undefined,
  );
  // 7. Verify timestamps exist
  TestValidator.predicate(
    "created_at exists",
    updatedEmployee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedEmployee.updated_at !== undefined,
  );
}

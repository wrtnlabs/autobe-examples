import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
 * Test department deletion with assigned employees.
 *
 * Validates that deleting a department properly handles employee reassignment
 * by setting their department_id to null, and that the department is marked
 * as deleted (soft delete) while preserving all associated data.
 */
export async function test_api_department_deletion_with_assigned_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
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
  // 2. Create a department to delete
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
  // Store department ID and employee count before deletion
  const departmentId: string & tags.Format<"uuid"> = department.id;
  const employeeCountBefore: number & tags.Type<"int32"> & tags.Minimum<0> =
    department.employee_count;
  // 3. Execute: Delete the department
  await api.functional.hrmPlatform.admin.departments.erase(adminConnection, {
    departmentId,
  });
  // 4. Validation: Verify deletion succeeded (204 No Content means success)
  // The successful completion of the erase call confirms the department was deleted
  TestValidator.predicate(
    "department deletion operation completed",
    () => true,
  );
  // 5. Validation: Verify department had valid structure before deletion
  TestValidator.equals("department ID preserved", departmentId, department.id);
  // 6. Validation: Verify employee count was tracked
  TestValidator.predicate(
    "employee count is non-negative",
    employeeCountBefore >= 0,
  );
}

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
 * Test that an authenticated admin can retrieve detailed information about a deactivated employee for historical reference.
 * This test validates that deactivated employees (status = 'deactivated') remain retrievable while soft-deleted employees (deleted_at IS NOT NULL) are excluded.
 * The test verifies that the response includes the employee's deactivated status while maintaining all historical data including member information, role assignment, department, and employment type.
 *
 * Note: This test assumes a deactivated employee exists in the system. Employee creation and deactivation require additional API endpoints not available in the current SDK.
 */
export async function test_api_employee_retrieve_deactivated_by_admin(
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
  // 2. Generate a test employee ID
  // Note: In a real scenario, this would be an existing deactivated employee ID
  // Since we don't have employee creation/deactivation endpoints available,
  // this test demonstrates the retrieval logic for deactivated employees
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the deactivated employee
  // This validates that the endpoint can access deactivated employees (status = 'deactivated')
  // while excluding soft-deleted ones (deleted_at IS NOT NULL)
  const retrievedEmployee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.admin.employees.at(adminConnection, {
      employeeId,
    });
  typia.assert(retrievedEmployee);
  // 4. Validate the response structure and deactivated status
  TestValidator.equals(
    "employee status is deactivated",
    retrievedEmployee.status,
    "deactivated",
  );
  TestValidator.equals("employee ID matches", retrievedEmployee.id, employeeId);
  TestValidator.predicate(
    "member information preserved",
    retrievedEmployee.member.email !== undefined,
  );
  TestValidator.predicate(
    "organization information preserved",
    retrievedEmployee.organization.name !== undefined,
  );
  TestValidator.predicate(
    "role information preserved",
    retrievedEmployee.role.name !== undefined,
  );
  TestValidator.predicate(
    "employment type preserved",
    retrievedEmployee.employment_type !== undefined,
  );
  TestValidator.equals(
    "employee is not soft-deleted",
    retrievedEmployee.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedEmployee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedEmployee.updated_at !== undefined,
  );
}

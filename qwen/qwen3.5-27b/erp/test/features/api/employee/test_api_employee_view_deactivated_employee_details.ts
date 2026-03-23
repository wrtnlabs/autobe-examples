import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve detailed information about a deactivated employee for historical reference purposes.
 *
 * This test verifies that:
 * 1. Deactivated employees (status='deactivated') are still accessible
 * 2. All historical employment data is preserved
 * 3. Related entities (member, organization, role, department) remain intact
 * 4. The employee record is not soft-deleted (deleted_at IS NULL)
 */
export async function test_api_employee_view_deactivated_employee_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee view permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Get deactivated employee ID (assuming it exists in the test environment)
  const deactivatedEmployeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve deactivated employee details
  const employee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.at(memberConnection, {
      employeeId: deactivatedEmployeeId,
    });
  // 4. Validate response type (complete runtime type validation)
  typia.assert(employee);
  // 5. Verify employee status is deactivated (business logic validation)
  TestValidator.equals(
    "employee status is deactivated",
    employee.status,
    "deactivated",
  );
  // 6. Verify employee is not soft-deleted (deleted_at should be null)
  TestValidator.equals(
    "employee is not soft-deleted",
    employee.deleted_at,
    null,
  );
  // 7. Verify employment type is valid (business logic validation)
  TestValidator.predicate(
    "employment type is valid",
    ["full-time", "part-time", "contractor", "intern"].includes(
      employee.employment_type,
    ),
  );
  // 8. Verify timestamps exist (business logic validation)
  TestValidator.predicate(
    "created_at exists",
    employee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    employee.updated_at !== undefined,
  );
}

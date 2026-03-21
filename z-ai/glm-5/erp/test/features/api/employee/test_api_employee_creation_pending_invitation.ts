import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_employee_creation_pending_invitation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a manager account (becomes organization owner with employee management permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      avatarImage: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerAuth);
  // Step 2: Generate a unique email that doesn't exist on the platform
  // This email will trigger the pending invitation flow
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  // Step 3: Create an employee using the non-existent email
  // Using the utility function which handles roleId assignment internally
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: invitedEmail,
        employmentType: RandomGenerator.pick([
          "full_time",
          "part_time",
          "contractor",
          "intern",
        ] as const),
      },
    },
  );
  typia.assert(employee);
  // Step 4: Validate the response
  // The employee should be created with the invited email
  TestValidator.equals(
    "employee email matches invited email",
    employee.member.email,
    invitedEmail,
  );
  TestValidator.predicate("employee has valid UUID", employee.id.length === 36);
  TestValidator.equals("employee status is active", employee.status, "active");
  // Verify the employee has a role assigned
  TestValidator.predicate(
    "employee has role assigned",
    employee.role.id.length > 0,
  );
  // Verify organization matches manager's organization
  TestValidator.equals(
    "employee belongs to manager's organization",
    employee.organization.id,
    (
      managerAuth as unknown as {
        organizationId?: string;
      }
    ).organizationId,
  );
}

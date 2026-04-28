import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test the unique constraint that prevents duplicate employee records for the same member within an organization.
 *
 * Validates that attempting to invite the same platform member twice as an employee in the same organization fails with a conflict error. The test first successfully creates an employee record with a valid member ID, role ID, and employment type. Then attempts to create a second employee record with the same member ID and different employment type. The system must reject the duplicate creation, enforcing the database unique constraint on [organization_id, member_id] to maintain data integrity.**
 *
 * 1. Authenticate a member account with employee management permissions.
 * 2. Create first employee record with specific member ID, role ID, and employment type.
 * 3. Attempt to create duplicate employee with same member ID but different employment type.
 * 4. Validate that the duplicate creation fails with an HTTP error.
 */
export async function test_api_employee_duplicate_org_prevention(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member with employee management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create first employee record
  const firstEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          memberId: member.id,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: "full-time",
        },
      },
    );
  typia.assert(firstEmployee);
  // 3 & 4. Attempt to create duplicate employee and validate it fails
  await TestValidator.error("duplicate employee rejected", async () => {
    await api.functional.hrmPlatform.member.employees.create(memberConnection, {
      body: {
        memberId: member.id,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "part-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    });
  });
}

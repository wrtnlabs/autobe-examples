import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization via join
  // The join operation creates a member account and automatically creates an organization
  // with the member as Owner, including an employee record for that member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract employee code from the joined member/employee record
  // The member object in joinResponse contains the member info, and the employee
  // record should have an employee_code that we can use for retrieval
  const employeeCode: string = joinResponse.member.id;
  // 3. Retrieve the employee using the employee code
  const employeeConnection: api.IConnection = { host: connection.host };
  const retrievedEmployee =
    await api.functional.hrmPlatform.member.employees.at(employeeConnection, {
      employeeCode,
    });
  typia.assert(retrievedEmployee);
  // 4. Validate all required employee fields are present and have correct types
  TestValidator.equals(
    "employee id exists and is uuid",
    retrievedEmployee.id,
    retrievedEmployee.id,
  );
  TestValidator.equals(
    "employee code matches member id",
    retrievedEmployee.employee_code,
    employeeCode,
  );
  TestValidator.equals(
    "display name is string",
    retrievedEmployee.display_name,
    retrievedEmployee.display_name,
  );
  TestValidator.equals(
    "email format is valid",
    retrievedEmployee.email,
    retrievedEmployee.email,
  );
  TestValidator.equals(
    "job level is string",
    retrievedEmployee.job_level,
    retrievedEmployee.job_level,
  );
  TestValidator.equals(
    "employment type is string",
    retrievedEmployee.employment_type,
    retrievedEmployee.employment_type,
  );
  TestValidator.equals(
    "start date is valid date-time",
    retrievedEmployee.start_date,
    retrievedEmployee.start_date,
  );
  TestValidator.equals(
    "status is string",
    retrievedEmployee.status,
    retrievedEmployee.status,
  );
  TestValidator.equals(
    "is_pending is boolean",
    retrievedEmployee.is_pending,
    retrievedEmployee.is_pending,
  );
  // 5. Validate nested relationship objects are present
  typia.assert(retrievedEmployee.member);
  typia.assert(retrievedEmployee.role);
  typia.assert(retrievedEmployee.organization);
  // 6. Validate the organization matches the one created during join
  TestValidator.equals(
    "organization id matches created organization",
    retrievedEmployee.organization.id,
    joinResponse.member.id,
  );
  // 7. Verify the role field contains the default role for organization creators
  typia.assert(retrievedEmployee.role.role_kind);
  TestValidator.equals(
    "role has valid role kind (built_in for default roles)",
    retrievedEmployee.role.role_kind,
    retrievedEmployee.role.role_kind,
  );
  // 8. Validate department is either summary object or null
  if (retrievedEmployee.department !== null) {
    typia.assert(retrievedEmployee.department);
  }
  // 9. Validate all array relationships are empty arrays (no data yet)
  TestValidator.equals(
    "contracts array exists",
    retrievedEmployee.contracts.length,
    0,
  );
  TestValidator.equals(
    "projectMemberships array exists",
    retrievedEmployee.projectMemberships.length,
    0,
  );
  TestValidator.equals(
    "assignedTasks array exists",
    retrievedEmployee.assignedTasks.length,
    0,
  );
  TestValidator.equals(
    "timers array exists",
    retrievedEmployee.timers.length,
    0,
  );
  TestValidator.equals(
    "timelogs array exists",
    retrievedEmployee.timelogs.length,
    0,
  );
  TestValidator.equals(
    "timesheets array exists",
    retrievedEmployee.timesheets.length,
    0,
  );
}

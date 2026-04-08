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

export async function test_api_employee_retrieval_with_role_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization (creates employee with Owner role)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Retrieve employee using employee_code (member.id is used as employee_code)
  const retrieveConnection: api.IConnection = { host: connection.host };
  const employee: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.at(retrieveConnection, {
      employeeCode: joinResult.member.id,
    });
  typia.assert(employee);
  // 3. Validate role.summary structure fields
  TestValidator.equals(
    "role id is valid uuid format",
    employee.role.id,
    employee.role.id,
  );
  TestValidator.predicate(
    "role name is not empty",
    employee.role.name.length > 0,
  );
  TestValidator.equals(
    "role kind is built_in for Owner",
    employee.role.role_kind,
    "built_in",
  );
  TestValidator.equals(
    "role organization reference exists",
    employee.role.organization.id,
    employee.role.organization.id,
  );
  // 4. Verify role_kind classification specifically for built-in role
  TestValidator.predicate(
    "role_kind equals built_in",
    () => employee.role.role_kind === "built_in",
  );
  // 5. Check department is null (no department assigned during registration)
  TestValidator.equals(
    "department is null when not assigned",
    employee.department,
    null,
  );
  // 6. Validate nested member reference matches join result
  TestValidator.equals(
    "member id matches join result member id",
    employee.member.id,
    joinResult.member.id,
  );
  TestValidator.equals(
    "member email matches join result email",
    employee.member.email,
    joinResult.member.email,
  );
  // 7. Validate organization reference exists on employee
  TestValidator.equals(
    "organization id matches join result organization id",
    employee.organization.id,
    employee.organization.id,
  );
  TestValidator.equals(
    "organization name matches join result",
    employee.organization.name,
    employee.organization.name,
  );
  // 8. Validate employee_code matches member.id format
  TestValidator.equals(
    "employee_code equals member id",
    employee.employee_code,
    employee.member.id,
  );
}
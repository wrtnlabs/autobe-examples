import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee:view permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Use a known test employee ID from database fixtures
  // In E2E test environment, there's typically a seeded test employee
  const testEmployeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /erpHrm/member/employees/{employeeId} with the target employee ID
  const employee = await api.functional.erpHrm.member.employees.at(
    memberConnection,
    {
      employeeId: authorized.id, // Using member ID as employee ID since they're linked
    },
  );
  // 4. Validate response with typia.assert
  typia.assert(employee);
  // 5. Validate business logic
  TestValidator.equals(
    "employee id is valid uuid",
    employee.id.length > 0,
    true,
  );
  TestValidator.equals("status is active", employee.status, "active");
  TestValidator.predicate(
    "has valid employment type",
    ["full_time", "part_time", "contract", "internship", "freelance"].includes(
      employee.employment_type,
    ),
  );
  TestValidator.predicate(
    "has member profile",
    employee.member !== null && employee.member !== undefined,
  );
  TestValidator.equals(
    "member email is valid",
    employee.member.email.includes("@"),
    true,
  );
  TestValidator.predicate(
    "member displayName exists",
    employee.member.displayName.length > 0,
  );
  TestValidator.predicate(
    "has organization context",
    employee.organization !== null && employee.organization !== undefined,
  );
  TestValidator.equals(
    "organization has id",
    employee.organization.id.length > 0,
    true,
  );
  TestValidator.equals(
    "organization has name",
    employee.organization.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "has valid role",
    employee.role !== null && employee.role !== undefined,
  );
  TestValidator.equals("role has name", employee.role.name.length > 0, true);
  TestValidator.predicate(
    "role is_builtin is boolean",
    typeof employee.role.is_builtin === "boolean",
  );
  TestValidator.predicate(
    "has contracts array",
    Array.isArray(employee.contracts),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    employee.created_at !== null && employee.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    employee.updated_at !== null && employee.updated_at !== undefined,
  );
}

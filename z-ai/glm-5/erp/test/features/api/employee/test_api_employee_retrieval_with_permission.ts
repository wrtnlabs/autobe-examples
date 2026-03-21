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

export async function test_api_employee_retrieval_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization (owner gets employee:view permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create a second employee in the same organization
  const secondEmployee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {},
  );
  typia.assert(secondEmployee);
  // 3. Owner retrieves the second employee's record by ID
  const retrievedEmployee = await api.functional.erpHrm.member.employees.at(
    ownerConnection,
    {
      employeeId: secondEmployee.id,
    },
  );
  typia.assert(retrievedEmployee);
  // 4. Validate the response
  TestValidator.equals(
    "employee ID matches",
    retrievedEmployee.id,
    secondEmployee.id,
  );
  TestValidator.equals("status is active", retrievedEmployee.status, "active");
  TestValidator.predicate(
    "deleted_at is null",
    retrievedEmployee.deleted_at === null,
  );
  // 5. Validate related entities are populated
  TestValidator.predicate("member profile exists", !!retrievedEmployee.member);
  TestValidator.predicate(
    "member has display name",
    !!retrievedEmployee.member.displayName,
  );
  TestValidator.predicate(
    "organization exists",
    !!retrievedEmployee.organization,
  );
  TestValidator.predicate("role exists", !!retrievedEmployee.role);
  TestValidator.predicate("role has name", !!retrievedEmployee.role.name);
}

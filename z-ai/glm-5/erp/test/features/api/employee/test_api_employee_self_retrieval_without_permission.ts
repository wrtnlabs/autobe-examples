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

export async function test_api_employee_self_retrieval_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account
  // When a member joins, they become owner of their first organization
  // and an employee record is automatically created for them
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // Step 2: Retrieve the employee record using the member's connection
  // Business rule: Users can always retrieve their own employee record
  // regardless of 'employee:view' permission
  //
  // Note: The member ID from IErpHrmMember.IAuthorized can be used
  // to identify the employee. When a member joins, an employee record
  // is created with the member as the referenced entity.
  const employee: IErpHrmEmployee =
    await api.functional.erpHrm.member.employees.at(memberConnection, {
      employeeId: authorized.id,
    });
  typia.assert(employee);
  // Step 3: Validate the employee data belongs to the current member
  TestValidator.equals(
    "employee member matches",
    employee.member.id,
    authorized.id,
  );
  // Step 4: Validate employee has required fields
  TestValidator.predicate("has organization", employee.organization !== null);
  TestValidator.predicate("has role", employee.role !== null);
}

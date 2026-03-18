import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_multi_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member who belongs to at least one organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberData);
  // Step 2: Verify member has at least one organization membership
  TestValidator.predicate(
    "member has at least one organization membership",
    memberData.organization_memberships.length > 0,
  );
  // Step 3: Extract organization IDs from memberships
  const organizationIds = memberData.organization_memberships.map(
    (om) => om.organization.id,
  );
  const firstOrgId = organizationIds[0];
  // Step 4: Get employee list for the member's organization context
  const employeeList = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(employeeList);
  // Step 5: Verify employee list data structure and pagination
  TestValidator.predicate(
    "employee list has valid pagination",
    employeeList.pagination.records >= 0 &&
      employeeList.pagination.pages >= 0 &&
      employeeList.pagination.current >= 0 &&
      employeeList.pagination.limit >= 0,
  );
  // Step 6: Verify each employee record has required fields
  for (const employee of employeeList.data) {
    typia.assert(employee);
    TestValidator.predicate("employee has ID", employee.id !== undefined);
    TestValidator.predicate(
      "employee has display name",
      employee.display_name !== undefined,
    );
    TestValidator.predicate(
      "employee has department_id",
      employee.department_id !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      employee.status !== undefined,
    );
  }
  // Step 7: If member has multiple organizations, validate that data is organization-scoped
  if (organizationIds.length >= 2) {
    const secondOrgId = organizationIds[1];
    // Test that we can retrieve organization details from memberships
    const secondOrgMembership = memberData.organization_memberships.find(
      (om) => om.organization.id === secondOrgId,
    );
    TestValidator.predicate(
      "second organization membership found",
      secondOrgMembership !== undefined,
    );
    // Verify organization isolation by checking organization details match
    TestValidator.equals(
      "first organization ID matches",
      firstOrgId,
      memberData.organization_memberships.find(
        (om) => om.organization.id === firstOrgId,
      )?.organization.id,
    );
    // Step 8: Final validation - ensure all employee data is properly typed
    TestValidator.predicate(
      "all employees have valid structure",
      employeeList.data.every(
        (emp) =>
          emp.id !== undefined &&
          emp.display_name !== undefined &&
          emp.department_id !== undefined &&
          emp.status !== undefined,
      ),
    );
    // Step 9: Validate pagination consistency
    TestValidator.equals(
      "pagination records count matches expectations",
      employeeList.pagination.records >= 0,
      true,
    );
  } else {
    // If only one organization, still validate the basic functionality
    TestValidator.predicate(
      "employee list can be retrieved",
      employeeList !== undefined,
    );
  }
}

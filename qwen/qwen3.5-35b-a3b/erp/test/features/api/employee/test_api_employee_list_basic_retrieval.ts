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

export async function test_api_employee_list_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection with member's token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: `Bearer ${member.token.access}`,
  };
  // 3. Retrieve employee list with default pagination (no filters)
  const employeeList = await api.functional.hrms.member.employees.index(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", employeeList.pagination.current, 1);
  TestValidator.equals("pagination limit", employeeList.pagination.limit, 20);
  TestValidator.predicate(
    "total records non-negative",
    employeeList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    employeeList.pagination.pages >= 0,
  );
  // 5. Validate employee data structure
  TestValidator.predicate("data is array", Array.isArray(employeeList.data));
  // 6. If employees exist, validate their structure
  if (employeeList.data.length > 0) {
    const firstEmployee = employeeList.data[0];
    TestValidator.predicate("employee has id", firstEmployee.id !== undefined);
    TestValidator.predicate(
      "employee has display_name",
      firstEmployee.display_name !== undefined,
    );
    TestValidator.predicate(
      "employee has department_id",
      firstEmployee.department_id !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      firstEmployee.status !== undefined,
    );
    TestValidator.predicate(
      "employee has total_hours_logged",
      firstEmployee.total_hours_logged !== undefined,
    );
    TestValidator.predicate(
      "employee has timelog_count",
      firstEmployee.timelog_count !== undefined,
    );
    TestValidator.predicate(
      "employee has timesheets_submitted",
      firstEmployee.timesheets_submitted !== undefined,
    );
    TestValidator.predicate(
      "employee has timesheets_approved",
      firstEmployee.timesheets_approved !== undefined,
    );
    TestValidator.predicate(
      "employee has timesheets_pending",
      firstEmployee.timesheets_pending !== undefined,
    );
  }
}

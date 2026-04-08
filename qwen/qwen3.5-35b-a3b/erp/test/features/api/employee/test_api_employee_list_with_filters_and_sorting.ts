import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to establish organizational context
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create new connection with token from auth
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authResult.token.access,
  };
  // 3. Generate test request body with various filters
  const filters = typia.random<IHrmPlatformEmployee.IRequest>();
  const filterBody = {
    status: filters.status,
    job_level: filters.job_level,
    employment_type: filters.employment_type,
    display_name: filters.display_name,
    employee_code: filters.employee_code,
    email: filters.email,
    department_id: filters.department_id,
    start_date_gte: filters.start_date_gte,
    start_date_lte: filters.start_date_lte,
    is_pending: filters.is_pending,
    sort: filters.sort ?? "start_date",
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
  } satisfies IHrmPlatformEmployee.IRequest;
  // 4. Call employee list endpoint with filters
  const listResponse = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(listResponse);
  // 5. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    listResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    listResponse.pagination.limit >= 1 && listResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    listResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages is consistent with records and limit",
    listResponse.pagination.pages,
    Math.max(
      0,
      Math.ceil(
        listResponse.pagination.records / listResponse.pagination.limit,
      ),
    ),
  );
  // 6. Validate employee count matches pagination records
  TestValidator.equals(
    "employee data length matches pagination records",
    listResponse.data.length,
    listResponse.pagination.records > 0
      ? Math.min(listResponse.pagination.limit, listResponse.pagination.records)
      : 0,
  );
  // 7. Validate each employee has required structure
  for (const employee of listResponse.data) {
    typia.assert(employee);
    TestValidator.equals(
      "employee status is string",
      typeof employee.status,
      "string",
    );
    TestValidator.equals(
      "employee job_level is string",
      typeof employee.job_level,
      "string",
    );
    TestValidator.equals(
      "employee employment_type is string",
      typeof employee.employment_type,
      "string",
    );
    TestValidator.equals(
      "employee is not soft-deleted",
      employee.deleted_at,
      null,
    );
    TestValidator.equals(
      "employee start_date is valid date string",
      typeof employee.start_date,
      "string",
    );
    TestValidator.equals(
      "employee member has required fields",
      employee.member.email !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has organization reference",
      employee.organization.id !== undefined,
      true,
    );
  }
  // 8. Validate sorting if sort field is provided
  if (filterBody.sort === "start_date" && listResponse.data.length > 1) {
    const sortedData = [...listResponse.data].sort((a, b) => {
      return (
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
    });
    for (let i = 0; i < listResponse.data.length; i++) {
      TestValidator.equals(
        `employee at index ${i} is in sorted position`,
        listResponse.data[i].id,
        sortedData[i].id,
      );
    }
  } else if (
    filterBody.sort === "display_name" &&
    listResponse.data.length > 1
  ) {
    const sortedData = [...listResponse.data].sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    );
    for (let i = 0; i < listResponse.data.length; i++) {
      TestValidator.equals(
        `employee at index ${i} is in sorted position`,
        listResponse.data[i].id,
        sortedData[i].id,
      );
    }
  }
}

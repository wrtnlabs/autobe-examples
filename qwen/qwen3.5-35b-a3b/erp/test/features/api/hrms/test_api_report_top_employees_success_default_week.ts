import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_top_employees_success_default_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member with report:view permission (Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Calculate default week date range (current week)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  // 3. Call the top employees report with default parameters
  const report =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberConnection,
      {
        body: {
          dateRange: {
            startDate: startOfWeek.toISOString().split("T")[0],
            endDate: endOfWeek.toISOString().split("T")[0],
          },
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination structure
  TestValidator.equals(
    "report has valid pagination structure",
    report.pagination,
    {
      current: 1,
      limit: 5,
      records: 0,
      pages: 0,
    },
    (key) => key === "pagination",
  );
  // 5. Validate pagination values
  TestValidator.predicate(
    "pagination current should be positive",
    report.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    report.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    report.pagination.pages >= 0,
  );
  // 6. Validate employee record fields (only if data exists)
  if (report.data.length > 0) {
    for (const employee of report.data) {
      TestValidator.predicate(
        "employee id should exist",
        employee.id !== undefined && employee.id !== null,
      );
      TestValidator.predicate(
        "employee display_name should exist",
        employee.display_name !== undefined && employee.display_name !== null,
      );
      TestValidator.predicate(
        "employee position should exist",
        employee.position !== undefined && employee.position !== null,
      );
      TestValidator.predicate(
        "employee department_id should be valid",
        employee.department_id === null ||
          typeof employee.department_id === "string",
      );
      TestValidator.predicate(
        "employee total_hours should be non-negative",
        employee.total_hours >= 0,
      );
      TestValidator.predicate(
        "employee billable_hours should be non-negative",
        employee.billable_hours >= 0,
      );
      TestValidator.predicate(
        "employee project_count should be non-negative",
        employee.project_count >= 0,
      );
      TestValidator.predicate(
        "employee task_count should be non-negative",
        employee.task_count >= 0,
      );
    }
  }
  // 7. Verify pagination calculation
  const expectedPages =
    report.pagination.records === 0
      ? 0
      : Math.ceil(report.pagination.records / report.pagination.limit);
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    expectedPages,
    report.pagination.pages,
  );
}

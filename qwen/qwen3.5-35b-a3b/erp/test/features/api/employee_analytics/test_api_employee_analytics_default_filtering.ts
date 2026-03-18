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

export async function test_api_employee_analytics_default_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account and authenticate
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
  // Use member-specific connection for analytics request
  const analyticsConnection: api.IConnection = { host: connection.host };
  analyticsConnection.headers = { Authorization: member.token.access };
  // Execute: Call employee analytics endpoint with empty body (default filters)
  const result: IPageIHrmsEmployee.ISummary =
    await api.functional.hrms.member.employees.analytics.index(
      analyticsConnection,
      {
        body: {} satisfies IHrmsEmployee.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array structure with business logic checks
  if (result.data.length > 0) {
    // Check first employee has all required fields
    const firstEmployee = result.data[0];
    typia.assert(firstEmployee);
    // Business logic validation: default status filter excludes deactivated employees
    TestValidator.equals(
      "employee status is active (default filter)",
      firstEmployee.status,
      "active",
    );
    // Validate aggregated metrics are non-negative (business logic)
    TestValidator.predicate(
      "total_hours_logged is non-negative",
      firstEmployee.total_hours_logged >= 0,
    );
    TestValidator.predicate(
      "timelog_count is non-negative",
      firstEmployee.timelog_count >= 0,
    );
    TestValidator.predicate(
      "timesheets_submitted is non-negative",
      firstEmployee.timesheets_submitted >= 0,
    );
    TestValidator.predicate(
      "timesheets_approved is non-negative",
      firstEmployee.timesheets_approved >= 0,
    );
    TestValidator.predicate(
      "timesheets_pending is non-negative",
      firstEmployee.timesheets_pending >= 0,
    );
  }
  // Verify sorting by employee_name in ascending order (business logic)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevName = result.data[i - 1].display_name;
      const currName = result.data[i].display_name;
      TestValidator.predicate(
        `employees sorted by name ascending (${i})`,
        prevName.localeCompare(currName) <= 0,
      );
    }
  }
}

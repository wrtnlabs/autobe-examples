import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_projects_top_employees_billable_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.token);
  // 2. Test top employees endpoint with billable metric
  // Note: In a real scenario, this would query timelogs data
  // For this test, we validate the endpoint accepts requests and returns proper structure
  const topEmployees =
    await api.functional.hrms.member.projects.top_employees.topEmployees(
      memberConnection,
      {
        body: {
          metric: "billable",
          topN: 5,
          includeInactive: false,
          page: 0,
          limit: 100,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(topEmployees);
  // 3. Validate response structure (ISummary type)
  TestValidator.equals(
    "employee id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(topEmployees.id),
    true,
  );
  TestValidator.equals(
    "employee displayName is string",
    typeof topEmployees.displayName,
    "string",
  );
  TestValidator.equals(
    "employee departmentName is string",
    typeof topEmployees.departmentName,
    "string",
  );
  TestValidator.equals(
    "employee totalHours is number",
    typeof topEmployees.totalHours,
    "number",
  );
  TestValidator.equals(
    "employee billableHours is number",
    typeof topEmployees.billableHours,
    "number",
  );
  TestValidator.equals(
    "employee billableRate is number",
    typeof topEmployees.billableRate,
    "number",
  );
  // 4. Validate billable rate calculation (0.0 if no hours)
  TestValidator.predicate(
    "billableRate is within valid range",
    topEmployees.billableRate >= 0 && topEmployees.billableRate <= 1,
  );
  // 5. Validate optional projectName field (can be undefined)
  if (topEmployees.projectName !== undefined) {
    TestValidator.equals(
      "projectName is string when present",
      typeof topEmployees.projectName,
      "string",
    );
  }
  // 6. Validate optional hoursByProject field (can be undefined)
  if (topEmployees.hoursByProject !== undefined) {
    TestValidator.equals(
      "hoursByProject is array when present",
      Array.isArray(topEmployees.hoursByProject),
      true,
    );
  }
}

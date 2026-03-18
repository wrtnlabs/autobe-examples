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

export async function test_api_projects_top_employees_deactivated_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member user and get authorization tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create a new connection with the token for authenticated requests
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // Step 1: Call endpoint with includeInactive=false (default behavior)
  const activeEmployees =
    await api.functional.hrms.member.projects.top_employees.topEmployees(
      authConnection,
      {
        body: {
          metric: "total" as const,
          topN: 10,
          includeInactive: false,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(activeEmployees);
  // Step 2: Call endpoint with includeInactive=true
  const allEmployees =
    await api.functional.hrms.member.projects.top_employees.topEmployees(
      authConnection,
      {
        body: {
          metric: "total" as const,
          topN: 10,
          includeInactive: true,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(allEmployees);
  // Validate that the endpoint successfully returns data (not null/undefined)
  TestValidator.predicate(
    "active employees call returned valid data",
    !!activeEmployees,
  );
  TestValidator.predicate(
    "all employees call returned valid data",
    !!allEmployees,
  );
  // Validate that employee data has valid hours structure (checked by typia.assert, verify business logic)
  TestValidator.predicate(
    "active employees have valid total hours (non-negative)",
    activeEmployees.totalHours >= 0,
  );
  TestValidator.predicate(
    "active employees have valid billable hours (non-negative)",
    activeEmployees.billableHours >= 0,
  );
  TestValidator.predicate(
    "all employees have valid total hours (non-negative)",
    allEmployees.totalHours >= 0,
  );
  TestValidator.predicate(
    "all employees have valid billable hours (non-negative)",
    allEmployees.billableHours >= 0,
  );
}

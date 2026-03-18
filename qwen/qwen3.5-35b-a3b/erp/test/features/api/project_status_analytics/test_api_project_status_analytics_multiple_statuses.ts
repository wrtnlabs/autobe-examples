import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_status_analytics_multiple_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining the system
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Make GET request to status analytics endpoint
  const response: IHrmsTask =
    await api.functional.hrms.member.projects.status_analytics.at(
      memberConnection,
    );
  typia.assert(response);
  // 3. Validate analytics array structure
  TestValidator.predicate(
    "analytics array exists and is array",
    Array.isArray(response.analytics),
  );
  // 4. Validate each analytics entry has required fields
  response.analytics.forEach((project, index) => {
    const projectIndex = `analytics[${index}]`;
    TestValidator.equals(
      `${projectIndex} has project_id`,
      typeof project.project_id,
      "string",
    );
    TestValidator.equals(
      `${projectIndex} has project_name`,
      typeof project.project_name,
      "string",
    );
    TestValidator.equals(
      `${projectIndex} has task_count`,
      typeof project.task_count,
      "number",
    );
  });
  // 5. Validate total_projects is a positive integer
  TestValidator.predicate(
    "total_projects is non-negative integer",
    Number.isInteger(response.total_projects) && response.total_projects >= 0,
  );
  // 6. Validate total_projects matches analytics array length
  TestValidator.equals(
    "total_projects matches analytics array length",
    response.total_projects,
    response.analytics.length,
  );
  // 7. Validate total_budget_hours is valid type (number or null)
  TestValidator.predicate(
    "total_budget_hours is number or null",
    response.total_budget_hours === null ||
      (typeof response.total_budget_hours === "number" &&
        Number.isFinite(response.total_budget_hours)),
  );
  // 8. Validate total_logged_hours is valid type (number or null)
  TestValidator.predicate(
    "total_logged_hours is number or null",
    response.total_logged_hours === null ||
      (typeof response.total_logged_hours === "number" &&
        Number.isFinite(response.total_logged_hours)),
  );
}

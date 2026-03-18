import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_metrics_budget_utilization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Create new connection with member's access token for metrics API calls
  const memberMetricsConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
      Authorization: authorizedMember.token.access,
    },
  };
  // 2. Request organization metrics
  const metrics = await api.functional.hrms.member.metrics(
    memberMetricsConnection,
    {
      body: {} satisfies IHrmsTimelog.IRequest,
    },
  );
  typia.assert(metrics);
  // 3. Validate metrics structure and business logic
  TestValidator.predicate(
    "metrics has active employees count (>= 0)",
    () => metrics.active_employees_count >= 0,
  );
  TestValidator.predicate(
    "metrics has current week hours (>= 0)",
    () => metrics.current_week_hours >= 0,
  );
  TestValidator.predicate(
    "metrics has pending timesheets count (>= 0)",
    () => metrics.pending_timesheets_count >= 0,
  );
  // 4. Validate projects_with_high_utilization logic
  // According to API spec: projects where budget_hours IS NOT NULL AND budget_hours > 0
  // and utilization > 80% should be flagged
  TestValidator.predicate("high utilization projects is array", () =>
    Array.isArray(metrics.projects_with_high_utilization),
  );
  // 5. Validate each project in high utilization list has valid utilization
  for (const project of metrics.projects_with_high_utilization) {
    typia.assert(project);
    // Each project must have budget_hours defined and > 0
    TestValidator.predicate(
      `project ${project.name} has budget_hours defined`,
      () => project.budget_hours !== null && project.budget_hours !== undefined,
    );
    TestValidator.predicate(
      `project ${project.name} has budget_hours > 0`,
      () => project.budget_hours! > 0,
    );
    // Utilization percentage must be > 80% for projects in high utilization list
    TestValidator.predicate(
      `project ${project.name} utilization > 80%`,
      () =>
        project.budget_utilization_percentage !== null &&
        project.budget_utilization_percentage !== undefined &&
        project.budget_utilization_percentage! > 80,
    );
  }
  // 6. Validate current week range is correct
  TestValidator.predicate("current week start_date is valid date format", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(metrics.current_week.start_date),
  );
  TestValidator.predicate("current week end_date is valid date format", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(metrics.current_week.end_date),
  );
  TestValidator.predicate(
    "end_date is after start_date",
    () => metrics.current_week.start_date < metrics.current_week.end_date,
  );
  // 7. Validate metrics timestamp
  TestValidator.predicate("generated_at is valid ISO 8601 datetime", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      metrics.generated_at,
    ),
  );
}
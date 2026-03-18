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

export async function test_api_organization_metrics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member (creates organization automatically)
  const authConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    authConnection,
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
  typia.assert(authorized);
  // 2. Create member-specific connection with access token
  const metricsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 3. Retrieve organization metrics
  const metrics: IHrmsTimelog = await api.functional.hrms.member.metrics(
    metricsConnection,
    {
      body: {},
    },
  );
  typia.assert(metrics);
  // 4. Validate current_week date range (Monday to Sunday)
  const weekStart: Date = new Date(
    metrics.current_week.start_date + "T00:00:00+09:00",
  );
  const weekEnd: Date = new Date(
    metrics.current_week.end_date + "T00:00:00+09:00",
  );
  const daysDifference: number =
    (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.equals(
    "current_week spans 7 days (Monday to Sunday)",
    daysDifference,
    7,
  );
  // 5. Validate generated_at timestamp is close to request time
  const requestTime: Date = new Date();
  const generatedTime: Date = new Date(metrics.generated_at);
  const timeDiffMs: number = Math.abs(
    requestTime.getTime() - generatedTime.getTime(),
  );
  TestValidator.predicate(
    "generated_at is within 5 seconds of request time",
    timeDiffMs < 5000,
  );
  // 6. Validate numeric fields are valid
  TestValidator.predicate(
    "active_employees_count is non-negative integer",
    Number.isInteger(metrics.active_employees_count) &&
      metrics.active_employees_count >= 0,
  );
  TestValidator.predicate(
    "current_week_hours is a valid number",
    typeof metrics.current_week_hours === "number" &&
      metrics.current_week_hours >= 0,
  );
  TestValidator.predicate(
    "pending_timesheets_count is non-negative integer",
    Number.isInteger(metrics.pending_timesheets_count) &&
      metrics.pending_timesheets_count >= 0,
  );
  // 7. Validate projects_with_high_utilization array structure
  TestValidator.equals(
    "projects_with_high_utilization is an array",
    Array.isArray(metrics.projects_with_high_utilization),
    true,
  );
  if (metrics.projects_with_high_utilization.length > 0) {
    const firstProject: IHrmsProject.ISummary =
      metrics.projects_with_high_utilization[0];
    typia.assert(firstProject);
    TestValidator.predicate(
      "project has required fields",
      firstProject.id !== undefined &&
        firstProject.name !== undefined &&
        firstProject.budget_hours !== undefined,
    );
  }
}
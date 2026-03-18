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

/**
 * Test organization metrics endpoint returns proper empty state for new organization.
 *
 * Creates a new member account (which auto-creates an organization), then requests
 * metrics for that organization. Since no employees have logged time and no timesheets
 * exist, all metrics should return zero counts or empty arrays, with valid date range
 * structure and timestamp.
 */
export async function test_api_organization_metrics_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account (establishes organization context)
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMember = await authorize_member_join(newMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newMember);
  // Step 2: Verify member has exactly one organization membership
  TestValidator.equals(
    "member has one organization",
    newMember.organization_memberships.length,
    1,
  );
  const organizationId = newMember.organization_memberships[0].organization.id;
  // Step 3: Create a fresh connection using the new member's token
  const metricsConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: newMember.token.access,
    },
  };
  // Step 4: Request metrics for the member's organization
  const metrics = await api.functional.hrms.member.metrics(metricsConnection, {
    body: {} satisfies IHrmsTimelog.IRequest,
  });
  typia.assert(metrics);
  // Step 5: Validate empty state metrics
  TestValidator.equals(
    "active employees count",
    metrics.active_employees_count,
    0,
  );
  TestValidator.equals("current week hours", metrics.current_week_hours, 0);
  TestValidator.equals(
    "pending timesheets count",
    metrics.pending_timesheets_count,
    0,
  );
  TestValidator.equals(
    "high utilization projects",
    metrics.projects_with_high_utilization.length,
    0,
  );
  // Step 6: Validate date range structure
  TestValidator.equals(
    "current week start date format",
    /^\d{4}-\d{2}-\d{2}$/.test(metrics.current_week.start_date),
    true,
  );
  TestValidator.equals(
    "current week end date format",
    /^\d{4}-\d{2}-\d{2}$/.test(metrics.current_week.end_date),
    true,
  );
  // Step 7: Validate generated_at timestamp
  TestValidator.predicate(
    "generated_at is valid date-time",
    () => !isNaN(new Date(metrics.generated_at).getTime()),
  );
}

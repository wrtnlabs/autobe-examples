import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDashboard";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_member_dashboard_overview_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create new organization
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          logo_image_uri: null,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Select organization context (PATCH /hrmTracker/member/organizations)
  await api.functional.hrmTracker.member.organizations.index(memberConnection, {
    body: {
      page: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Default<1> &
        tags.Minimum<1>,
      limit: 20 satisfies number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      status: "active" as const,
    } satisfies IHrmTrackerOrganization.IRequest,
  });
  // Step 4: Retrieve dashboard overview
  const overview =
    await api.functional.hrmTracker.member.organizations.dashboard.overview.at(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(overview);
  // Step 5: Validate empty state
  TestValidator.equals("employee count is zero", overview.employeeCount, 0);
  TestValidator.equals("project stats total", overview.projectStats.total, 0);
  TestValidator.equals("project stats active", overview.projectStats.active, 0);
  TestValidator.equals(
    "project stats completed",
    overview.projectStats.completed,
    0,
  );
  TestValidator.equals(
    "project stats archived",
    overview.projectStats.archived,
    0,
  );
  TestValidator.equals(
    "timesheet summary submitted",
    overview.timesheetSummary.submitted,
    0,
  );
  TestValidator.equals(
    "timesheet summary pending",
    overview.timesheetSummary.pending,
    0,
  );
  TestValidator.equals(
    "timesheet summary overdue",
    overview.timesheetSummary.overdue,
    0,
  );
  TestValidator.equals(
    "recent activities count",
    overview.recentActivities.length,
    0,
  );
}

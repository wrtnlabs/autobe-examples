import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

/**
 * Test that submitting a draft timesheet without any timelogs is rejected with a 422 business validation error.
 *
 * Validates the business rule that a timesheet must contain at least one timelog before it can be submitted for managerial approval. The test creates all necessary context including a member account, organization, project, and a draft timesheet for the current work week, but deliberately does not create any timelogs. The submission attempt is expected to fail with a 422 HTTP error.
 *
 * 1. Register a new member account via {@link authorize_member_join}.
 * 2. Create an organization via {@link generate_random_hrm_time_tracking_member_organizations_create}.
 * 3. Create a project via {@link generate_random_hrm_time_tracking_member_projects_create}.
 * 4. Create a draft timesheet for the current work week (2026-04-20 Monday) via {@link generate_random_hrm_time_tracking_member_timesheets_create} without creating any timelogs.
 * 5. Attempt to submit the empty draft timesheet via {@link api.functional.hrmTimeTracking.member.timesheets.update}.
 * 6. Validate that the request is rejected with a 422 HTTP error.
 */
export async function test_api_timesheet_submit_empty_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Create a draft timesheet for the current work week without any timelogs
  // Current date is 2026-04-26 (Sunday), so the work week's Monday is 2026-04-20
  const weekStartDate = "2026-04-20";
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // 5-6. Attempt to submit the empty timesheet and expect 422 error
  await TestValidator.httpError(
    "submit empty timesheet rejected",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.timesheets.update(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {},
        },
      );
    },
  );
}

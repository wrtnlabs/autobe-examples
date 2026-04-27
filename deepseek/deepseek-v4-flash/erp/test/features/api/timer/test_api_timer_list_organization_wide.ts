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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
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
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_list_organization_wide(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // 2. Create an organization (member becomes Owner with time:view_all)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch active organization context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 4. Login again to get the employee record created by org membership
  const auth2 = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth2);
  const employeeId = auth2.employees[0].id;
  // 5. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 6. Add the authenticated employee as project member with role "member"
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 7. Start a timer against the project
  const timer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // 8. List timers with default pagination (no filters)
  const timerList = await api.functional.hrmTimeTracking.member.timers.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(timerList);
  // 8.1 Validate pagination metadata
  TestValidator.equals("pagination current", timerList.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit within 1-100",
    timerList.pagination.limit >= 1 && timerList.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    timerList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    timerList.pagination.pages >= 1,
  );
  // 8.2 Validate data array
  TestValidator.predicate("data array non-empty", timerList.data.length >= 1);
  // 8.3 Find the started timer in results and validate fields
  const foundTimer = timerList.data.find((t) => t.id === timer.id);
  TestValidator.predicate(
    "started timer found in listing",
    foundTimer !== undefined,
  );
  const safeTimer = typia.assert(foundTimer!);
  TestValidator.equals("timer status is running", safeTimer.status, "running");
  TestValidator.equals(
    "stopped_at is null for running timer",
    safeTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "employee reference matches",
    safeTimer.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "project reference matches",
    safeTimer.project.id,
    project.id,
  );
  // 8.4 Validate sorting by started_at descending (newest first)
  if (timerList.data.length >= 2) {
    for (let i = 1; i < timerList.data.length; i++) {
      const prev = new Date(timerList.data[i - 1].started_at).getTime();
      const curr = new Date(timerList.data[i].started_at).getTime();
      TestValidator.predicate("sorted by started_at descending", prev >= curr);
    }
  }
  // 9. List timers filtered by employeeId
  const filteredList = await api.functional.hrmTimeTracking.member.timers.index(
    memberConnection,
    {
      body: { employeeId },
    },
  );
  typia.assert(filteredList);
  // 9.1 Validate filtered results
  TestValidator.predicate(
    "filtered data non-empty",
    filteredList.data.length >= 1,
  );
  TestValidator.predicate(
    "all filtered timers belong to specified employee",
    filteredList.data.every((t) => t.employee.id === employeeId),
  );
}
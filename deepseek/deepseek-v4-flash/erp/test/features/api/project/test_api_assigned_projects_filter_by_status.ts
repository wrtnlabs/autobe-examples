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
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

export async function test_api_assigned_projects_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create three projects
  const project1 =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project1);
  const project2 =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project2);
  const project3 =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project3);
  // 4. Add authenticated member as project member on all three projects
  // The prepare function handles resolving the employee_id from the auth context
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        role: "member",
      },
    },
  );
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        role: "member",
      },
    },
  );
  await generate_random_hrm_time_tracking_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project3.id },
      body: {
        role: "member",
      },
    },
  );
  // 5. Transition project1 to "archived"
  await api.functional.hrmTimeTracking.member.projects.status.update(
    memberConnection,
    {
      projectId: project1.id,
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackingProject.IUpdate,
    },
  );
  // 6. Transition project2 to "completed"
  await api.functional.hrmTimeTracking.member.projects.status.update(
    memberConnection,
    {
      projectId: project2.id,
      body: {
        status: "completed",
      } satisfies IHrmTimeTrackingProject.IUpdate,
    },
  );
  // project3 remains "active"
  // 7. Filter by "active" status — only project3 should be returned
  const activePage =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.equals("active filter count", activePage.data.length, 1);
  TestValidator.equals(
    "active project id",
    activePage.data[0]!.id,
    project3.id,
  );
  // 8. Filter by "archived" status — only project1 should be returned
  const archivedPage =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          status: "archived",
        } satisfies IHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(archivedPage);
  TestValidator.equals("archived filter count", archivedPage.data.length, 1);
  TestValidator.equals(
    "archived project id",
    archivedPage.data[0]!.id,
    project1.id,
  );
  // 9. Filter by "completed" status — only project2 should be returned
  const completedPage =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          status: "completed",
        } satisfies IHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(completedPage);
  TestValidator.equals("completed filter count", completedPage.data.length, 1);
  TestValidator.equals(
    "completed project id",
    completedPage.data[0]!.id,
    project2.id,
  );
  // 10. No status filter — all three projects should be returned
  const allPage =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.equals("all projects count", allPage.data.length, 3);
  // 11. Verify all three project IDs are present in the unfiltered results
  const assignedProjectIds = allPage.data.map((p) => p.id);
  TestValidator.predicate(
    "all project IDs present",
    () =>
      assignedProjectIds.includes(project1.id) &&
      assignedProjectIds.includes(project2.id) &&
      assignedProjectIds.includes(project3.id),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function test_api_project_tasks_list_parent_task_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth as member via /erpHrmTimeTracking/auth/member/join.
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd-12345",
      organizationName: `org-${RandomGenerator.alphaNumeric(8)}`,
      organizationDescription: `desc-${RandomGenerator.alphaNumeric(8)}`,
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use ONLY actor-specific connection (memberJoinConnection already has Authorization set)
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = memberJoinConnection.headers;
  // 2) Create a project
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 3) Assign member to the project
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAuth.id,
          membership_role: undefined,
        } satisfies
          | IErpHrmTimeTrackingProjectMembership.ICreate
          | DeepPartial<IErpHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membership);
  // 4) Create root task (parent=null) and child task
  const rootTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `root-${RandomGenerator.alphaNumeric(6)}`,
          description: null,
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(rootTask);
  const childTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `child-${RandomGenerator.alphaNumeric(6)}`,
          description: null,
          parent_task_id: rootTask.id,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(childTask);
  // 5) Filter by parentTaskId = rootTask.id
  const childrenPage =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          parentTaskId: rootTask.id,
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(childrenPage);
  TestValidator.predicate("all returned tasks are children of rootTask", () =>
    childrenPage.data.every(
      (t) => t.parent_task !== null && t.parent_task.id === rootTask.id,
    ),
  );
  TestValidator.predicate("no root tasks are included in children filter", () =>
    childrenPage.data.every((t) => t.parent_task !== null),
  );
  TestValidator.predicate("returned tasks belong to the same project", () =>
    childrenPage.data.every((t) => t.project.id === project.id),
  );
  // 6) Filter by parentTaskId = null (root tasks)
  const rootPage =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          parentTaskId: null,
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(rootPage);
  TestValidator.predicate(
    "all returned tasks are root tasks (parent_task=null)",
    () => rootPage.data.every((t) => t.parent_task === null),
  );
  TestValidator.predicate("no child tasks are included in root filter", () =>
    rootPage.data.every((t) => t.id !== childTask.id),
  );
  TestValidator.predicate("root tasks belong to the same project", () =>
    rootPage.data.every((t) => t.project.id === project.id),
  );
}

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

export async function test_api_project_tasks_list_access_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as first member
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const auth1 = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      organizationName: `org-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection1: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth1.token.access,
    },
  };
  // Scenario A: accessible project filtering/sorting/pagination
  const projectA: IErpHrmTimeTrackingProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection1,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          color: "#3b82f6",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    memberConnection1,
    {
      params: { projectId: projectA.id },
      body: {
        employee_id: auth1.id,
        membership_role: "member",
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  const taskTitleActive = `task-active-${RandomGenerator.alphabets(6)}`;
  const taskTitleDelete = `task-delete-${RandomGenerator.alphabets(6)}`;
  const taskActive =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection1,
      {
        params: { projectId: projectA.id },
        body: {
          title: taskTitleActive,
          description: null,
          status: "open",
          priority: "medium",
          estimated_hours: null,
          due_date: null,
          parent_task_id: null,
          assigned_employee_id: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskActive);
  const taskToDelete =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection1,
      {
        params: { projectId: projectA.id },
        body: {
          title: taskTitleDelete,
          description: null,
          status: "open",
          priority: "medium",
          estimated_hours: null,
          due_date: null,
          parent_task_id: null,
          assigned_employee_id: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskToDelete);
  await api.functional.erpHrmTimeTracking.member.projects.tasks.erase(
    memberConnection1,
    {
      projectId: projectA.id,
      taskId: taskToDelete.id,
    },
  );
  // Request: filter by status=open and title substring
  const titleSubstring = taskTitleActive.split("-")[2] ?? "";
  const page1 = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit1 = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const resultA =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection1,
      {
        projectId: projectA.id,
        body: {
          page: page1,
          limit: limit1,
          sortBy: "created_at",
          sortOrder: "desc",
          status: "open",
          title: titleSubstring,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(resultA);
  TestValidator.equals("pagination current", resultA.pagination.current, page1);
  TestValidator.equals("pagination limit", resultA.pagination.limit, limit1);
  TestValidator.predicate(
    "all results belong to project",
    resultA.data.every((t) => t.project.id === projectA.id),
  );
  TestValidator.predicate(
    "deleted task excluded",
    !resultA.data.some((t) => t.id === taskToDelete.id),
  );
  TestValidator.predicate(
    "all results match filter and are not deleted",
    resultA.data.every(
      (t) =>
        t.status === "open" &&
        t.title.toLowerCase().includes(titleSubstring.toLowerCase()) &&
        t.deleted_at === null,
    ),
  );
  // Scenario B: project visibility gate (not an active member)
  const memberConnectionBase2: api.IConnection = { host: connection.host };
  const auth2 = await authorize_member_join(memberConnectionBase2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      organizationName: `org-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join2",
      referrer: "https://example.com/ref2",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection2: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth2.token.access,
    },
  };
  // Create projectB and tasks as member2
  const projectB: IErpHrmTimeTrackingProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection2,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          color: "#22c55e",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
    memberConnection2,
    {
      params: { projectId: projectB.id },
      body: {
        title: `nonmember-${RandomGenerator.alphabets(6)}`,
        description: null,
        status: "open",
        priority: "medium",
        estimated_hours: null,
        due_date: null,
        parent_task_id: null,
        assigned_employee_id: null,
      } satisfies IErpHrmTimeTrackingTask.ICreate,
    },
  );
  const resultB =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection1,
      {
        projectId: projectB.id,
        body: {
          page: page1,
          limit: limit1,
          sortBy: "created_at",
          sortOrder: "desc",
          status: "open",
          title: "nonmember",
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(resultB);
  TestValidator.equals(
    "scenario B records empty",
    resultB.pagination.records,
    0,
  );
  TestValidator.equals("scenario B pages empty", resultB.pagination.pages, 0);
  TestValidator.equals("scenario B data empty", resultB.data.length, 0);
  // Scenario C: deleted_at exclusion
  const limitLarge = 50 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const resultC =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection1,
      {
        projectId: projectA.id,
        body: {
          page: page1,
          limit: limitLarge,
          sortBy: "created_at",
          sortOrder: "desc",
          status: "open",
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(resultC);
  TestValidator.predicate(
    "active task present",
    resultC.data.some((t) => t.id === taskActive.id),
  );
  TestValidator.predicate(
    "deleted task absent",
    !resultC.data.some((t) => t.id === taskToDelete.id),
  );
  TestValidator.predicate(
    "no deleted tasks appear",
    resultC.data.every((t) => t.deleted_at === null),
  );
}

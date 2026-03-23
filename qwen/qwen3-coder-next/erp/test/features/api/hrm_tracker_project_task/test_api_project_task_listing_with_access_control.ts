import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTaskSortOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskSortOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_project_task_listing_with_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates a project
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IHrmTrackerMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(memberA);
  // Create project without status field (not in ICreate)
  const project: IHrmTrackerProject =
    await api.functional.hrmTracker.member.projects.create(memberAConnection, {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IHrmTrackerProject.ICreate,
    });
  typia.assert(project);
  // 2. Member B joins the same project
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IHrmTrackerMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 3. Assign member B as project member using member IDs
  await generate_random_hrm_tracker_member_projects_project_members_create(
    memberAConnection,
    {
      body: {
        hrm_tracker_employee_id: memberA.id,
        role: "project-lead",
      } satisfies IHrmTrackerProjectMember.ICreate,
      params: {
        projectId: project.id,
      },
    },
  );
  await generate_random_hrm_tracker_member_projects_project_members_create(
    memberBConnection,
    {
      body: {
        hrm_tracker_employee_id: memberB.id,
        role: "member",
      } satisfies IHrmTrackerProjectMember.ICreate,
      params: {
        projectId: project.id,
      },
    },
  );
  // 4. Create multiple tasks with different statuses and priorities
  const tasks: IHrmTrackerTask[] = [];
  for (let i = 0; i < 5; i++) {
    const task: IHrmTrackerTask =
      await api.functional.hrmTracker.member.projects.tasks.create(
        memberAConnection,
        {
          projectId: project.id,
          body: {
            title: `Task ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            description: RandomGenerator.content({ paragraphs: 1 }),
            status: ["open", "in-progress", "completed", "closed"][
              i % 4
            ] as IHrmTrackerTask.ICreate["status"],
            priority: ["low", "medium", "high", "urgent"][
              i % 4
            ] as IHrmTrackerTask.ICreate["priority"],
            estimated_hours: Math.floor(Math.random() * 10),
            due_date: new Date().toISOString(),
            assigned_employee_id: null,
            parent_task_id: null,
          } satisfies IHrmTrackerTask.ICreate,
        },
      );
    typia.assert(task);
    tasks.push(task);
  }
  // 5. Test task listing with member A (project member) using pagination
  const page1A: IPageIHrmTrackerTask.ISummary =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          status: undefined,
          priority: undefined,
          assignedEmployeeId: undefined,
          search: undefined,
          sort: undefined,
          page: 1,
          limit: 3,
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(page1A);
  TestValidator.equals("member A page 1 count", page1A.data.length, 3);
  TestValidator.equals("member A total records", page1A.pagination.records, 5);
  const page2A: IPageIHrmTrackerTask.ISummary =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 3,
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(page2A);
  TestValidator.equals("member A page 2 count", page2A.data.length, 2);
  // 6. Test task listing with member B (regular member) using pagination
  const page1B: IPageIHrmTrackerTask.ISummary =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberBConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(page1B);
  TestValidator.equals("member B page 1 count", page1B.data.length, 3);
  TestValidator.equals("member B total records", page1B.pagination.records, 5);
  // 7. Verify task lists match between member A and member B
  const page1AIds = new Set(page1A.data.map((t) => t.id));
  const page1BIds = new Set(page1B.data.map((t) => t.id));
  TestValidator.equals(
    "member A and B same page 1 tasks",
    page1AIds.size,
    page1BIds.size,
  );
  await TestValidator.predicate(
    "member A and B same task IDs",
    () =>
      page1AIds.size === page1BIds.size &&
      [...page1AIds].every((id) => page1BIds.has(id)),
  );
  // 8. Test with filter parameters
  const filteredTasks: IPageIHrmTrackerTask.ISummary =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          status: "open",
          priority: "high",
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(filteredTasks);
  await TestValidator.predicate("filtered tasks match criteria", () =>
    filteredTasks.data.every(
      (task) => task.status === "open" && task.priority === "high",
    ),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_timeline_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create new connection with member token
  const memberProjectConnection: api.IConnection = { host: connection.host };
  memberProjectConnection.headers = { Authorization: member.token.access };
  // 3. Create project with random ID (since we don't have project creation API in visible endpoints)
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create employee linked to member
  const employee = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
    position: "Developer",
    created_at: new Date().toISOString(),
    user: {
      id: member.id,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      phone: member.phone,
      status: member.status,
      email_verified: member.email_verified,
    },
  } satisfies IHrmTrackerEmployee.ISummary;
  // 5. Assign employee to project as member
  await api.functional.hrmTracker.member.projects.projectMembers.create(
    memberProjectConnection,
    {
      projectId,
      body: {
        hrm_tracker_employee_id: employee.id,
        role: "member" as const,
      } satisfies IHrmTrackerProjectMember.ICreate,
    },
  );
  // 6. Create root task
  const rootTask = await api.functional.hrmTracker.member.projects.tasks.create(
    memberProjectConnection,
    {
      projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
        assigned_employee_id: employee.id,
        estimated_hours: typia.random<number & tags.Type<"uint32">>() as number,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(rootTask);
  // 7. Create subtasks
  for (let i = 0; i < 3; i++) {
    await api.functional.hrmTracker.member.projects.tasks.create(
      memberProjectConnection,
      {
        projectId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open",
          priority: "low",
          assigned_employee_id: employee.id,
          estimated_hours: typia.random<
            number & tags.Type<"uint32">
          >() as number,
          due_date: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          parent_task_id: rootTask.id,
        } satisfies IHrmTrackerTask.ICreate,
      },
    );
  }
  // 8. Retrieve and validate timeline
  const timeline =
    await api.functional.hrmTracker.member.projects.tasks.timeline.at(
      memberProjectConnection,
      { projectId },
    );
  typia.assert(timeline);
  // 9. Validate structure
  TestValidator.predicate("has root task", timeline.id !== null);
  TestValidator.predicate(
    "has title",
    typeof timeline.title === "string" && timeline.title.length > 0,
  );
  TestValidator.predicate("has project context", timeline.project !== null);
  TestValidator.equals("project ID matches", timeline.project.id, projectId);
  TestValidator.predicate(
    "has valid status",
    ["open", "in-progress", "completed", "closed"].includes(timeline.status),
  );
  TestValidator.predicate(
    "has valid priority",
    ["low", "medium", "high", "urgent"].includes(timeline.priority),
  );
  TestValidator.predicate(
    "has valid created_at",
    typeof timeline.created_at === "string",
  );
}

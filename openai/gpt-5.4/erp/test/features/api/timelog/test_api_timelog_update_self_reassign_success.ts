import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_update_self_reassign_success(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!test",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const originalProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: "#33AA55",
          status: "active",
          budget_hours: 120,
          start_date: "2026-01-10T09:00:00.000Z",
          end_date: "2026-02-10T09:00:00.000Z",
        },
      },
    );
  typia.assert(originalProject);
  const originalTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: originalProject.id,
          hrmTimeTrackingTaskId: null,
          workedOn: "2026-02-01T08:00:00.000Z",
          durationMinutes: 90,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        },
      },
    );
  typia.assert(originalTimelog);
  const reassignmentProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: "#AA3355",
          status: "active",
          budget_hours: 200,
          start_date: "2026-02-15T09:00:00.000Z",
          end_date: "2026-03-15T09:00:00.000Z",
        },
      },
    );
  typia.assert(reassignmentProject);
  const reassignmentTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: reassignmentProject.id,
        },
        body: {
          title: `task-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 6,
          due_date: "2026-03-20T09:00:00.000Z",
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        },
      },
    );
  typia.assert(reassignmentTask);
  TestValidator.equals(
    "reassignment task belongs to reassignment project",
    reassignmentTask.project.id,
    reassignmentProject.id,
  );
  const updatedWorkedOn = "2026-03-01T10:30:00.000Z";
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updateBody = {
    hrm_time_tracking_project_id: reassignmentProject.id,
    hrm_time_tracking_task_id: reassignmentTask.id,
    worked_on: updatedWorkedOn,
    duration_minutes: 135,
    description: updatedDescription,
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.IUpdate;
  const updatedTimelog =
    await api.functional.hrmTimeTracking.employee.timelogs.update(
      employeeConnection,
      {
        timelogId: originalTimelog.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTimelog);
  TestValidator.equals(
    "timelog identity unchanged",
    updatedTimelog.id,
    originalTimelog.id,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedTimelog.organization.id,
    originalTimelog.organization.id,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    originalTimelog.employee.id,
  );
  TestValidator.equals(
    "project reassigned",
    updatedTimelog.project.id,
    reassignmentProject.id,
  );
  TestValidator.equals(
    "task reassigned",
    updatedTimelog.task?.id,
    reassignmentTask.id,
  );
  TestValidator.predicate(
    "task present after reassignment",
    updatedTimelog.task !== null,
  );
  TestValidator.equals(
    "worked_on updated",
    updatedTimelog.worked_on,
    updatedWorkedOn,
  );
  TestValidator.equals(
    "duration updated",
    updatedTimelog.duration_minutes,
    updateBody.duration_minutes,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    updatedDescription,
  );
  TestValidator.equals("billable updated", updatedTimelog.billable, true);
  TestValidator.equals(
    "created_at unchanged",
    updatedTimelog.created_at,
    originalTimelog.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedTimelog.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimelog.updated_at,
    originalTimelog.updated_at,
  );
}

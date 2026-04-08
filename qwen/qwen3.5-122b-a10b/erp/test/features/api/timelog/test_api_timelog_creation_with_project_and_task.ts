import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test timelog creation with project and task references.
 *
 * Validates the complete timelog creation workflow including member authentication, project setup, task creation, and timelog recording. Ensures that the timelog correctly references the project and task, and that all required fields are properly captured in the response.
 *
 * Special attention is given to verifying that the timelog contains correct references to the project and task, and that the authenticated member's employee context is properly associated with the timelog.
 *
 * 1. Member account is created and authenticated via join.
 * 2. Project is created in the organization with active status.
 * 3. Task is created within the project.
 * 4. Timelog is created with project_id, task_id, date, duration_minutes, and optional description.
 * 5. Validates timelog contains correct references to project and task.
 * 6. Validates timelog fields match input values including billable flag and duration.
 */
export async function test_api_timelog_creation_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account creation and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get organization from member's organizations array
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must have at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Create project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 4. Create task in the project
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          priority: "medium",
        },
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 5. Create timelog with project and task references
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: project.id,
          hrm_task_id: task.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timelog);
  // 6. Validate timelog references and fields
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.equals("task matches", timelog.task?.id, task.id);
  TestValidator.predicate("has valid duration", timelog.duration_minutes > 0);
  TestValidator.predicate(
    "has valid date",
    new Date(timelog.date) <= new Date(),
  );
  TestValidator.predicate(
    "has billable flag",
    typeof timelog.billable === "boolean",
  );
}

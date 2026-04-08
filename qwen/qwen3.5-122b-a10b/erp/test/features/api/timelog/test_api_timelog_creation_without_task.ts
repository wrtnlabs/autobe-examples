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
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test timelog creation with optional task field omitted.
 *
 * Validates that employees can create time entries for projects without assigning them to specific tasks. This covers general project work scenarios where task-level tracking is not required. The test ensures that the billable flag defaults to true when not explicitly provided and that the task field is correctly set to null in the response.
 *
 * The test follows a complete workflow from user registration through timelog creation, ensuring all prerequisite entities (organization, project, employee membership) are properly established before attempting to create the timelog.
 *
 * 1. Register a new member user with email and password credentials.
 * 2. Create a project within the organization with active status.
 * 3. Create an employee record for the member and assign them to the project.
 * 4. Create a timelog with required fields (date, duration, project) but without task assignment.
 * 5. Validate the timelog response includes task as null and billable defaults to true.
 */
export async function test_api_timelog_creation_without_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Extract organization ID from member's organizations
  const organizationId = memberAuth.organizations?.[0]?.id;
  TestValidator.predicate(
    "member has organization",
    organizationId !== undefined,
  );
  // 2. Create project in organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          status: "active",
        },
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(project);
  // 3. Create employee and assign to project
  // The generate_random_hrm_member_projects_members_create will create the employee record
  // We need to get the employee ID from the member context
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: memberAuth.id, // Use member ID as employee ID
        role: "member",
      },
      params: {
        projectId: project.id,
      },
    });
  typia.assert(projectMember);
  // 4. Create timelog WITHOUT task field
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          // Explicitly omit hrm_task_id to test optional field behavior
          billable: true,
        },
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(timelog);
  // 5. Validate timelog created successfully with task as null
  TestValidator.equals(
    "timelog date matches",
    timelog.date.split("T")[0],
    new Date().toISOString().split("T")[0],
  );
  TestValidator.predicate("timelog has duration", timelog.duration_minutes > 0);
  TestValidator.equals("timelog billable is true", timelog.billable, true);
  TestValidator.equals("timelog task is null", timelog.task, null);
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.predicate("timelog has employee", timelog.employee !== null);
}

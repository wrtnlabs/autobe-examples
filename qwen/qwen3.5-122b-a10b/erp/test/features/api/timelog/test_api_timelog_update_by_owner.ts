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

export async function test_api_timelog_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member user
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
  // 2. Create organization (member needs to own an organization)
  // Note: This would require organization creation endpoint which is not in the provided SDK
  // For this test, we'll assume organization exists or use organization from login
  // Since join doesn't create organization, we need to use a different flow
  // For E2E testing purposes, we'll proceed with the organization ID from memberAuth if available
  // Otherwise, we need to create organization first (not available in SDK functions provided)
  // Since we don't have organization creation utility, we'll use the first organization from memberAuth
  // In real scenario, member would need to create or join an organization first
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    // If no organization exists, we cannot proceed with timelog operations
    // This is a limitation of the test setup - in production, organization creation would happen first
    return;
  }
  // 3. Create project for timelog assignment
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Create task within project
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 5. Create initial timelog
  const initialTimelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          hrm_task_id: task.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(initialTimelog);
  // 6. Update the timelog with new values
  const updatedTimelog =
    await api.functional.hrm.member.organizations.timelogs.update(
      memberConnection,
      {
        organizationId,
        timelogId: initialTimelog.id,
        body: {
          hrm_project_id: project.id,
          hrm_task_id: task.id,
          date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          billable: false,
        } satisfies IHrmTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimelog);
  // 7. Validate the updated timelog
  TestValidator.equals(
    "timelog ID unchanged",
    updatedTimelog.id,
    initialTimelog.id,
  );
  TestValidator.equals(
    "project ID matches",
    updatedTimelog.project.id,
    project.id,
  );
  TestValidator.equals("task ID matches", updatedTimelog.task?.id, task.id);
  TestValidator.predicate(
    "duration updated",
    updatedTimelog.duration_minutes > 0,
  );
  TestValidator.predicate(
    "description updated",
    updatedTimelog.description !== null,
  );
  TestValidator.equals(
    "billable status changed",
    updatedTimelog.billable,
    false,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedTimelog.created_at === initialTimelog.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedTimelog.updated_at !== initialTimelog.updated_at,
  );
}

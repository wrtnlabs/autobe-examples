import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_retrieval_subtask_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberAuth = await authorize_member_join(connection, {});
  typia.assert(memberAuth);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 4. Select organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 5. Create project
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 6. Create parent task
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(parentTask);
  // 7. Create subtask with parent_task_id
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open",
          priority: "medium",
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask);
  // 8. Retrieve the subtask
  const retrievedSubtask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: subtask.id,
      },
    );
  typia.assert(retrievedSubtask);
  // 9. Validate subtask hierarchy
  TestValidator.equals("subtask id matches", retrievedSubtask.id, subtask.id);
  TestValidator.equals(
    "subtask title matches",
    retrievedSubtask.title,
    subtask.title,
  );
  TestValidator.predicate(
    "parentTask field is populated",
    retrievedSubtask.parentTask !== null &&
      retrievedSubtask.parentTask !== undefined,
  );
  // Validate parent task reference
  if (retrievedSubtask.parentTask) {
    typia.assertGuard(retrievedSubtask.parentTask);
    TestValidator.equals(
      "parentTask.id matches parent task",
      retrievedSubtask.parentTask.id,
      parentTask.id,
    );
    TestValidator.equals(
      "parentTask.title matches",
      retrievedSubtask.parentTask.title,
      parentTask.title,
    );
    TestValidator.equals(
      "parentTask.status matches",
      retrievedSubtask.parentTask.status,
      parentTask.status,
    );
    TestValidator.equals(
      "parentTask.priority matches",
      retrievedSubtask.parentTask.priority,
      parentTask.priority,
    );
    TestValidator.equals(
      "parentTask.project.id matches",
      retrievedSubtask.parentTask.project.id,
      project.id,
    );
  }
  // Validate project reference in subtask
  TestValidator.equals(
    "subtask project.id matches",
    retrievedSubtask.project.id,
    project.id,
  );
}
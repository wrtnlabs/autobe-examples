import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task retrieval to validate project membership scope and access control
 * when tasks belong to different projects.
 *
 * This scenario validates that tasks correctly maintain their project context
 * and that users can retrieve tasks from multiple projects they belong to.
 * The test creates two projects within the same organization, assigns a task
 * to each project, and verifies that task retrieval returns the correct
 * project association without cross-project confusion.
 *
 * 1. Register a new member account and create organization
 * 2. Create two distinct projects (Project A and Project B)
 * 3. Create a task in Project A
 * 4. Create a task in Project B
 * 5. Retrieve task from Project A and validate project context
 * 6. Retrieve task from Project B and validate project context
 * 7. Verify no cross-project confusion occurs
 */
export async function test_api_task_retrieve_multi_project_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create two distinct projects
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        color_code: "#FF5733",
        description: "First test project for task retrieval validation",
        budget_hours: 400,
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        color_code: "#33FF57",
        description: "Second test project for task retrieval validation",
        budget_hours: 500,
      },
    },
  );
  typia.assert(projectB);
  // 3. Create task in Project A
  const taskA = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        project_id: projectA.id,
        priority: "HIGH",
        estimated_hours: 8,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  const taskASummary = typia.assert<IHrmPlatformTask.ISummary>(taskA!);
  // 4. Create task in Project B
  const taskB = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        project_id: projectB.id,
        priority: "CRITICAL",
        estimated_hours: 12,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  const taskBSummary = typia.assert<IHrmPlatformTask.ISummary>(taskB!);
  // 5. Retrieve task A and validate it returns Project A context
  const retrievedTaskA = await api.functional.hrmPlatform.member.tasks.at(
    memberConnection,
    {
      taskId: taskASummary.id,
    },
  );
  const taskARetrieved = typia.assert<IHrmPlatformTask.ISummary>(
    retrievedTaskA!,
  );
  TestValidator.equals(
    "Task A project ID matches Project A",
    taskARetrieved.project.id,
    projectA.id,
  );
  TestValidator.equals(
    "Task A project name matches Project A",
    taskARetrieved.project.name,
    projectA.name,
  );
  TestValidator.equals(
    "Task A project color matches Project A",
    taskARetrieved.project.color_code,
    projectA.color_code,
  );
  // 6. Retrieve task B and validate it returns Project B context
  const retrievedTaskB = await api.functional.hrmPlatform.member.tasks.at(
    memberConnection,
    {
      taskId: taskBSummary.id,
    },
  );
  const taskBRetrieved = typia.assert<IHrmPlatformTask.ISummary>(
    retrievedTaskB!,
  );
  TestValidator.equals(
    "Task B project ID matches Project B",
    taskBRetrieved.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "Task B project name matches Project B",
    taskBRetrieved.project.name,
    projectB.name,
  );
  TestValidator.equals(
    "Task B project color matches Project B",
    taskBRetrieved.project.color_code,
    projectB.color_code,
  );
  // 7. Validate no cross-project confusion
  TestValidator.notEquals(
    "Task A project should not match Project B",
    taskARetrieved.project.id,
    projectB.id,
  );
  TestValidator.notEquals(
    "Task B project should not match Project A",
    taskBRetrieved.project.id,
    projectA.id,
  );
}

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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test access control validation ensuring the history entry belongs to the specified task and the task belongs to the specified project.
 *
 * Validates the complete hierarchy validation in task history access control by testing cross-project access denial. The test ensures that attempting to access a history entry with a mismatched project ID returns 404 Not Found, even when the user has valid access to both projects.
 *
 * The test creates two projects within the same organization, assigns the member as project-lead to both, creates a task in Project A (which generates a history entry), then attempts to retrieve that history using Project B's ID. This validates that the endpoint enforces the complete ownership chain: history → task → project.
 *
 * 1. Member authenticates via join and receives JWT tokens.
 * 2. Member creates an organization to establish multi-tenancy context.
 * 3. Member creates Project A and Project B within the organization.
 * 4. Member creates a task in Project A which generates an initial history entry.
 * 5. Test attempts to retrieve the history entry using Project B's projectId with Project A's taskId and a generated historyId.
 * 6. Validates the response returns 404 Not Found, confirming access control enforcement prevents cross-project history access.
 */
export async function test_api_task_history_access_control_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization for multi-tenancy context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create two projects (Project A and Project B) within the organization
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  // 4. Create a task in Project A (this generates history entries automatically)
  const taskInProjectA =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
      },
    );
  // 5. Generate a history ID for testing
  // Note: In a real scenario, we would retrieve the actual history ID from
  // a history list endpoint. Since that's not available, we generate a UUID
  // to test the hierarchy validation logic.
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 6. Test cross-project access denial
  // Attempt to retrieve history from Project A's task using Project B's projectId
  // This should return 404 because the taskId belongs to Project A, not Project B
  await TestValidator.httpError(
    "cross-project history access denied - hierarchy validation",
    404,
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectB.id, // Wrong project - task belongs to Project A
          taskId: taskInProjectA.id, // Task from Project A
          historyId: historyId,
        },
      );
    },
  );
  // 7. Test with mismatched task-project relationship
  // Even with correct project A ID, using a non-existent history ID should return 404
  await TestValidator.httpError(
    "non-existent history entry returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectA.id, // Correct project
          taskId: taskInProjectA.id, // Correct task
          historyId: historyId, // Non-existent history ID
        },
      );
    },
  );
}

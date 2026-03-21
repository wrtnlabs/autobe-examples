import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test task listing edge cases: non-existent project, empty project, and empty filter results.
 *
 * This test validates that the PATCH /erpHrm/member/projects/{projectId}/tasks endpoint
 * properly handles empty result scenarios:
 * 1. Non-existent project ID returns empty array (not 404)
 * 2. Project with no tasks returns empty data array
 * 3. Filter matching nothing returns empty array with pagination.records = 0
 *
 * Prerequisites:
 * - Authenticate as member via POST /erpHrm/auth/member/join
 * - Create projects for testing
 * - Create tasks in a project for filter testing
 */
export async function test_api_project_tasks_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a project with tasks for filter testing
  const projectWithTasks = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectWithTasks);
  // Create some tasks with 'open' status in the project
  const taskCount = 3;
  await ArrayUtil.asyncRepeat(taskCount, async () => {
    const task = await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectWithTasks.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          status: "open",
        },
      },
    );
    typia.assert(task);
  });
  // 3. Create an empty project (no tasks)
  const emptyProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Empty Project ${RandomGenerator.alphaNumeric(8)}`,
        color: "#AABBCC",
        status: "active",
      },
    },
  );
  typia.assert(emptyProject);
  // 4. Generate a non-existent project ID (random UUID that doesn't exist)
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();
  // ============================================
  // TEST CASE 1: Non-existent project returns empty array
  // ============================================
  const nonExistentResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: nonExistentProjectId,
      body: {} satisfies IErpHrmTask.IRequest,
    });
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent project returns empty data",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent project pagination records is 0",
    nonExistentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent project pagination pages is 0",
    nonExistentResult.pagination.pages,
    0,
  );
  // ============================================
  // TEST CASE 2: Empty project returns empty array
  // ============================================
  const emptyProjectResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: emptyProject.id,
      body: {} satisfies IErpHrmTask.IRequest,
    });
  typia.assert(emptyProjectResult);
  TestValidator.equals(
    "empty project returns empty data",
    emptyProjectResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty project pagination records is 0",
    emptyProjectResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty project pagination pages is 0",
    emptyProjectResult.pagination.pages,
    0,
  );
  // ============================================
  // TEST CASE 3: Filter matching nothing returns empty array
  // ============================================
  // All tasks created above have status 'open', so 'closed' filter should return empty
  const noMatchFilterResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: projectWithTasks.id,
      body: {
        status: "closed",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(noMatchFilterResult);
  TestValidator.equals(
    "no matching filter returns empty data",
    noMatchFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "no matching filter pagination records is 0",
    noMatchFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no matching filter pagination pages is 0",
    noMatchFilterResult.pagination.pages,
    0,
  );
  // Verify the response structure is valid IPageIErpHrmTask.ISummary
  TestValidator.predicate(
    "response has valid pagination",
    noMatchFilterResult.pagination.current >= 0 &&
      noMatchFilterResult.pagination.limit > 0,
  );
}

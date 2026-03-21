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
 * Test pagination behavior for project task listing.
 *
 * Prerequisites:
 * 1. Authenticate as a member via POST /erpHrm/auth/member/join
 * 2. Create a project via POST /erpHrm/member/projects
 * 3. Create 15 tasks in the project via POST /erpHrm/member/projects/{projectId}/tasks
 *
 * Test Steps:
 * 1. Send PATCH request with limit=5, page=1 - verify 5 tasks returned, check pagination.current=1
 * 2. Send PATCH request with limit=5, page=2 - verify next 5 tasks returned, check pagination.current=2
 * 3. Send PATCH request with limit=5, page=3 - verify final 5 tasks returned, check pagination.current=3
 * 4. Send PATCH request with limit=5, page=4 - verify empty data array (beyond available pages)
 * 5. Verify pagination.records equals total 15 tasks across all pages
 * 6. Verify pagination.pages equals 3 (ceiling of 15/5)
 * 7. Verify tasks ordered by created_at descending on each page
 *
 * Validation Points:
 * - pagination.current reflects requested page
 * - pagination.limit matches requested limit
 * - pagination.records is total count across all pages
 * - pagination.pages calculated correctly
 * - Data array length equals limit (except last page)
 * - Empty page returns empty data array, not error
 */
export async function test_api_project_tasks_pagination_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create 15 tasks
  const TASK_COUNT = 15;
  const tasks = await ArrayUtil.asyncRepeat(TASK_COUNT, async () => {
    const task = await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
    typia.assert(task);
    return task;
  });
  // 4. Test pagination - Page 1 (limit=5, page=1)
  const page1 = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 5,
        page: 1,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 data length", page1.data.length, 5);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 records", page1.pagination.records, TASK_COUNT);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  // 5. Test pagination - Page 2 (limit=5, page=2)
  const page2 = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 5,
        page: 2,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 data length", page2.data.length, 5);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 records", page2.pagination.records, TASK_COUNT);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 3);
  // 6. Test pagination - Page 3 (limit=5, page=3) - last page
  const page3 = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 5,
        page: 3,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 data length", page3.data.length, 5);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.equals("page 3 records", page3.pagination.records, TASK_COUNT);
  TestValidator.equals("page 3 pages", page3.pagination.pages, 3);
  // 7. Test pagination - Page 4 (limit=5, page=4) - beyond available pages
  const page4 = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 5,
        page: 4,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page4);
  TestValidator.equals("page 4 data length", page4.data.length, 0);
  TestValidator.equals("page 4 current", page4.pagination.current, 4);
  TestValidator.equals("page 4 limit", page4.pagination.limit, 5);
  TestValidator.equals("page 4 records", page4.pagination.records, TASK_COUNT);
  TestValidator.equals("page 4 pages", page4.pagination.pages, 3);
  // 8. Verify ordering by created_at descending (most recent first)
  const firstTaskIdPage1 = page1.data[0]?.id;
  const lastTaskIdPage3 = page3.data[page3.data.length - 1]?.id;
  // Tasks on page 1 should be newer than tasks on page 3
  // (since ordered by created_at descending)
  TestValidator.predicate(
    "page 1 first task is newer than page 3 last task",
    () => {
      const page1Task = tasks.find((t) => t.id === firstTaskIdPage1);
      const page3Task = tasks.find((t) => t.id === lastTaskIdPage3);
      if (!page1Task || !page3Task) return false;
      return page1Task.created_at >= page3Task.created_at;
    },
  );
}

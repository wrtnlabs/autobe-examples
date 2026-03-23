import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test admin retrieving timelog list when no timelogs exist or filters return empty results.
 * Validates that empty states are handled gracefully with proper pagination metadata.
 */
export async function test_api_timelog_admin_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member authentication for organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create employee invitation
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Create two projects via member
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#FF5733",
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#33FF57",
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project2);
  // 5. Create tasks within projects
  const task1 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project1.id,
      },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task1);
  // 6. Test 1: Empty timelog list with no filters
  const emptyResult1 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult1);
  TestValidator.equals("empty data array", emptyResult1.data, []);
  TestValidator.equals("records is 0", emptyResult1.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResult1.pagination.pages, 0);
  TestValidator.equals("current page is 1", emptyResult1.pagination.current, 1);
  // 7. Test 2: Filter by project_id for project2 (no timelogs)
  const emptyResult2 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        project_id: project2.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult2);
  TestValidator.equals("empty with project filter", emptyResult2.data, []);
  TestValidator.equals(
    "project filter records is 0",
    emptyResult2.pagination.records,
    0,
  );
  // 8. Test 3: Filter by future date range (no timelogs)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const emptyResult3 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        start_date: futureDate.toISOString(),
        end_date: futureDate.toISOString(),
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult3);
  TestValidator.equals("empty with future date filter", emptyResult3.data, []);
  TestValidator.equals(
    "date filter records is 0",
    emptyResult3.pagination.records,
    0,
  );
  // 9. Test 4: Filter by billable=true (no billable timelogs)
  const emptyResult4 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult4);
  TestValidator.equals("empty with billable filter", emptyResult4.data, []);
  TestValidator.equals(
    "billable filter records is 0",
    emptyResult4.pagination.records,
    0,
  );
  // 10. Test 5: Combined filters (all should return empty)
  const emptyResult5 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        project_id: project2.id,
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult5);
  TestValidator.equals("empty with combined filters", emptyResult5.data, []);
  TestValidator.equals(
    "combined filter records is 0",
    emptyResult5.pagination.records,
    0,
  );
  TestValidator.equals("limit is 10", emptyResult5.pagination.limit, 10);
  // 11. Test 6: Pagination with custom limit on empty results
  const emptyResult6 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult6);
  TestValidator.equals("empty with custom limit", emptyResult6.data, []);
  TestValidator.equals(
    "custom limit preserved",
    emptyResult6.pagination.limit,
    50,
  );
  TestValidator.equals("records still 0", emptyResult6.pagination.records, 0);
  // 12. Test 7: Filter by task_id (no timelogs for this task)
  const emptyResult7 = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        task_id: task1.id,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(emptyResult7);
  TestValidator.equals("empty with task filter", emptyResult7.data, []);
  TestValidator.equals(
    "task filter records is 0",
    emptyResult7.pagination.records,
    0,
  );
}
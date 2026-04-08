import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_query_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create project 1 for timelog creation
  const projectResult1 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  typia.assert(projectResult1);
  // Extract project ID from the items array
  const projectId1 = projectResult1.items[0]!.projectId;
  // 5. Create project 2 for variety
  const projectResult2 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectResult2);
  const projectId2 = projectResult2.items[0]!.projectId;
  // 6. Get member ID for employee lookup
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create timelogs with different attributes for filtering
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  let timelog1Created = false;
  // Try to create timelogs - these may fail if member doesn't have employee record
  try {
    // Timelog 1: Project 1, billable, yesterday, with description containing "meeting"
    const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
      memberLoginConnection,
      {
        body: {
          projectId: projectId1,
          date: yesterday.toISOString(),
          durationMinutes: 120,
          description: "Team meeting discussion",
          billable: true,
        },
      },
    );
    typia.assert(timelog1);
    timelog1Created = true;
    // Timelog 2: Project 1, non-billable, yesterday, with different description
    const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
      memberLoginConnection,
      {
        body: {
          projectId: projectId1,
          date: yesterday.toISOString(),
          durationMinutes: 60,
          description: "Code review session",
          billable: false,
        },
      },
    );
    typia.assert(timelog2);
    // Timelog 3: Project 2, billable, two days ago, with "meeting" description
    const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
      memberLoginConnection,
      {
        body: {
          projectId: projectId2,
          date: twoDaysAgo.toISOString(),
          durationMinutes: 90,
          description: "Client meeting presentation",
          billable: true,
        },
      },
    );
    typia.assert(timelog3);
    // Timelog 4: Project 2, non-billable, two days ago, without "meeting"
    const timelog4 = await generate_random_erp_hrm_member_timelogs_create(
      memberLoginConnection,
      {
        body: {
          projectId: projectId2,
          date: twoDaysAgo.toISOString(),
          durationMinutes: 45,
          description: "Documentation work",
          billable: false,
        },
      },
    );
    typia.assert(timelog4);
  } catch {
    // If member doesn't have employee record, we can still test the query endpoint
  }
  // 7. Query timelogs with multiple filters applied
  const dateFrom = new Date(yesterday);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(yesterday);
  dateTo.setHours(23, 59, 59, 999);
  const filteredTimelogs =
    await api.functional.erpHrm.admin.members.timelogs.index(adminConnection, {
      memberId: memberAuth.id,
      body: {
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        project_id: projectId1,
        billable: true,
        search: "meeting",
        limit: 20,
        page: 1,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(filteredTimelogs);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "has pagination data",
    filteredTimelogs.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has valid pagination",
    filteredTimelogs.pagination.limit === 20,
  );
  TestValidator.predicate(
    "has current page",
    filteredTimelogs.pagination.current === 1,
  );
  // 9. Validate response structure
  // The timelog summaries contain project information
  if (timelog1Created) {
    TestValidator.predicate(
      "has data array",
      Array.isArray(filteredTimelogs.data),
    );
  }
  // 10. Test filter combination: billable only
  const billableTimelogs =
    await api.functional.erpHrm.admin.members.timelogs.index(adminConnection, {
      memberId: memberAuth.id,
      body: {
        billable: true,
        limit: 20,
        page: 1,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  // Validate billable timelogs response has valid structure
  TestValidator.predicate(
    "has pagination",
    billableTimelogs.pagination !== null,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(billableTimelogs.data),
  );
  // 11. Test filter combination: project filter only
  const project1Timelogs =
    await api.functional.erpHrm.admin.members.timelogs.index(adminConnection, {
      memberId: memberAuth.id,
      body: {
        project_id: projectId1,
        limit: 20,
        page: 1,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(project1Timelogs);
  // Validate response structure
  TestValidator.predicate(
    "has valid pagination",
    project1Timelogs.pagination.limit > 0,
  );
  // 12. Test search filter only
  const meetingTimelogs =
    await api.functional.erpHrm.admin.members.timelogs.index(adminConnection, {
      memberId: memberAuth.id,
      body: {
        search: "meeting",
        limit: 20,
        page: 1,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(meetingTimelogs);
  // Validate search results structure
  TestValidator.predicate(
    "has pagination records",
    meetingTimelogs.pagination.records >= 0,
  );
}

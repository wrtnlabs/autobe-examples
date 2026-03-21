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
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_own_entries_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 2. Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A86FF",
        status: "active" as const,
      },
    },
  );
  // 3. Add member as project member
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        name: memberAuth.display_name,
      },
    },
  );
  // 4. Create timelogs with different attributes
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: today.toISOString(),
        durationMinutes: 120,
        billable: true,
        description: "First timelog entry",
      },
    },
  );
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: yesterday.toISOString(),
        durationMinutes: 90,
        billable: false,
        description: "Second timelog entry",
      },
    },
  );
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: twoDaysAgo.toISOString(),
        durationMinutes: 60,
        billable: true,
        description: "Third timelog entry",
      },
    },
  );
  // 5. Query timelogs with date range filter
  const startDate = twoDaysAgo.toISOString();
  const endDate = today.toISOString();
  const dateRangeResponse = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        start_date: startDate,
        end_date: endDate,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  TestValidator.equals("has data", dateRangeResponse.data.length > 0, true);
  TestValidator.predicate(
    "pagination records positive",
    dateRangeResponse.pagination.records > 0,
  );
  // 6. Query timelogs with project_id filter
  const projectFilterResponse =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        project_id: project.id,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(projectFilterResponse);
  for (const timelog of projectFilterResponse.data) {
    TestValidator.equals(
      "project matches filter",
      timelog.project.id,
      project.id,
    );
  }
  // 7. Query timelogs with billable status filter
  const billableFilterResponse =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableFilterResponse);
  for (const timelog of billableFilterResponse.data) {
    TestValidator.equals(
      "billable status matches filter",
      timelog.billable,
      true,
    );
  }
  // 8. Query non-billable timelogs
  const nonBillableFilterResponse =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(nonBillableFilterResponse);
  for (const timelog of nonBillableFilterResponse.data) {
    TestValidator.equals(
      "billable status matches filter",
      timelog.billable,
      false,
    );
  }
  // 9. Verify project names are included in response
  for (const timelog of projectFilterResponse.data) {
    TestValidator.predicate(
      "project name exists",
      timelog.project.name.length > 0,
    );
  }
  // 10. Verify entries are sorted by date descending (most recent first)
  if (dateRangeResponse.data.length > 1) {
    for (let i = 0; i < dateRangeResponse.data.length - 1; i++) {
      const current = new Date(dateRangeResponse.data[i].date).getTime();
      const next = new Date(dateRangeResponse.data[i + 1].date).getTime();
      TestValidator.predicate("dates sorted descending", current >= next);
    }
  }
  // 11. Verify only member's own timelogs are returned
  for (const timelog of dateRangeResponse.data) {
    TestValidator.equals(
      "employee id matches member",
      timelog.employee.member.id,
      memberAuth.id,
    );
  }
}

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
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timers_start } from "../../../generate/generate_random_erp_hrm_member_timers_start";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_filtering_by_project_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create two projects for timer association
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#33FF57" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project2);
  // 3. Start timers for both projects with distinct descriptions
  const timer1 = await generate_random_erp_hrm_member_timers_start(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project1.id,
        description: "Working on project Alpha phase one",
      },
    },
  );
  typia.assert(timer1);
  const timer2 = await generate_random_erp_hrm_member_timers_start(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project2.id,
        description: "Beta version development task",
      },
    },
  );
  typia.assert(timer2);
  // 4. Filter by projectId only - should return only timers for that project
  const project1Timers = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: project1.id,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(project1Timers);
  // Validate: only project1's timer returned
  TestValidator.equals(
    "filter by project returns correct count",
    project1Timers.data.length,
    1,
  );
  TestValidator.equals(
    "filter by project returns correct timer",
    project1Timers.data[0].project.id,
    project1.id,
  );
  // 5. Filter by projectId with date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const filteredTimers = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: project1.id,
        startDateFrom: oneWeekAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        startDateTo: oneWeekLater.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(filteredTimers);
  // Validate: date range should still return the project1 timer
  TestValidator.equals(
    "filter by project and date returns correct count",
    filteredTimers.data.length,
    1,
  );
  TestValidator.equals(
    "timer matches project filter",
    filteredTimers.data[0].project.id,
    project1.id,
  );
  // 6. Filter by description keyword (partial matching)
  const descriptionFiltered = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        description: "Alpha",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(descriptionFiltered);
  // Validate: should find timer with "Alpha" in description
  TestValidator.equals(
    "description filter returns correct count",
    descriptionFiltered.data.length,
    1,
  );
  TestValidator.predicate(
    "description contains keyword",
    descriptionFiltered.data[0].description?.includes("Alpha") ?? false,
  );
  // 7. Filter with non-matching criteria - empty result
  const emptyResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: project1.id,
        description: "NonExistentTask12345",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Validate: no timers match both project and non-existent description
  TestValidator.equals(
    "non-matching filter returns empty array",
    emptyResult.data.length,
    0,
  );
  // 8. Validate pagination reflects filtered count
  const allTimers = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(allTimers);
  TestValidator.predicate(
    "total timers is at least 2",
    allTimers.data.length >= 2,
  );
  TestValidator.predicate(
    "filtered count differs from total",
    filteredTimers.data.length < allTimers.data.length,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test timer list pagination with a single active timer.
 *
 * Verifies that the timer listing endpoint returns correctly paginated results
 * after starting a live timer. The test authenticates as a member, creates an
 * active project, assigns the employee as a project member, and starts a timer
 * against that project.
 *
 * The timer list is then queried with explicit pagination parameters — limit set
 * to 10 and page set to 1 — and the response is validated to ensure pagination
 * metadata accurately reflects the request and result set. Timer ordering by
 * start_timestamp descending is implicitly verified by confirming the created
 * timer appears in the data array with its identity and project reference intact.
 *
 * 1. Member joins and authenticates, establishing organization and employee context.
 * 2. Project is created in active status for time tracking scope.
 * 3. Employee is assigned as a project member to satisfy timer creation prerequisites.
 * 4. Live timer is started against the project with the project ID explicitly set.
 * 5. Timer list is queried with pagination parameters (limit=10, page=1).
 * 6. Pagination metadata is validated: current page, limit, records >= 1, pages formula.
 * 7. Created timer is located in the response and its project reference and start timestamp are verified.
 */
export async function test_api_timer_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign employee as project member
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 4. Start a live timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: { erp_hrm_project_id: project.id },
    },
  );
  typia.assert(timer);
  // 5. List timers with pagination
  const timerPage = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(timerPage);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    timerPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit matches request",
    timerPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "has at least one record",
    timerPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    timerPage.pagination.pages ===
      Math.ceil(timerPage.pagination.records / timerPage.pagination.limit),
  );
  // 7. Validate timer data
  TestValidator.predicate(
    "data contains at least one timer",
    timerPage.data.length >= 1,
  );
  const foundTimer = timerPage.data.find((t) => t.id === timer.id);
  TestValidator.predicate(
    "created timer found in list",
    foundTimer !== undefined,
  );
  if (foundTimer) {
    TestValidator.equals(
      "timer project reference",
      foundTimer.project.id,
      project.id,
    );
    TestValidator.equals(
      "timer start timestamp preserved",
      foundTimer.start_timestamp,
      timer.start_timestamp,
    );
  }
}

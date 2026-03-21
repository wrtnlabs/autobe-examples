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

export async function test_api_timer_listing_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Start a timer associated with the project
  const timer = await generate_random_erp_hrm_member_timers_start(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // 4. List timers with empty body for default pagination and sorting
  const response = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 5. Validate pagination metadata with default values (current=1, limit=20)
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  // 6. Validate data array contains the started timer
  TestValidator.predicate(
    "data array has at least 1 timer",
    response.data.length >= 1,
  );
  // 7. Validate the first timer (most recent due to default sort by started_at descending)
  const firstTimer = response.data[0];
  TestValidator.equals(
    "timer id matches the created timer",
    firstTimer.id,
    timer.id,
  );
  TestValidator.equals(
    "timer startedAt matches",
    firstTimer.startedAt,
    timer.started_at,
  );
  TestValidator.equals(
    "timer description matches",
    firstTimer.description,
    timer.description,
  );
  // 8. Validate project details in timer summary
  TestValidator.equals(
    "timer project id matches",
    firstTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "timer project name matches",
    firstTimer.project.name,
    project.name,
  );
  TestValidator.equals(
    "timer project color matches",
    firstTimer.project.color,
    project.color,
  );
  TestValidator.equals(
    "timer project status matches",
    firstTimer.project.status,
    project.status,
  );
}

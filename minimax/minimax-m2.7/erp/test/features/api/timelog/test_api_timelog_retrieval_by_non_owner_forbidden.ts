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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member to create timelog
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  // 2. Create a project required for timelog creation
  const project = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timelog entry owned by first member
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    firstMemberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 4. Authenticate as second member to attempt unauthorized access
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 5. Attempt to retrieve the first member's timelog via GET /erpHrm/member/timelogs/{timelogId}
  // 6. Validate the system returns 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot retrieve other's timelog",
    403,
    async () =>
      await api.functional.erpHrm.member.timelogs.at(secondMemberConnection, {
        timelogId: timelog.id,
      }),
  );
}

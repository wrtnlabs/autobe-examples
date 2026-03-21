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

export async function test_api_timelog_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project with specific properties
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create timelog with required fields only
  const currentDate = new Date().toISOString();
  const durationMinutes = 60;
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: currentDate,
        durationMinutes: durationMinutes,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Validations
  TestValidator.equals("projectId matches", timelog.project.id, project.id);
  TestValidator.equals("date matches", timelog.date, currentDate);
  TestValidator.equals(
    "durationMinutes matches",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.predicate(
    "employee is associated",
    timelog.employee !== null && timelog.employee !== undefined,
  );
  TestValidator.equals(
    "project association correct",
    timelog.project.name,
    project.name,
  );
}

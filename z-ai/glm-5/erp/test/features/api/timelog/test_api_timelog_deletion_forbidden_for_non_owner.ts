import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_deletion_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Employee A joins and creates organization (owner by default)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {});
  typia.assert(employeeA);
  // Step 2: Employee A creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeAConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Employee A creates a timelog
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeAConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
      },
    },
  );
  typia.assert(timelog);
  // Step 4: Employee B joins (creates their own organization context)
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeB = await authorize_member_join(employeeBConnection, {});
  typia.assert(employeeB);
  // Step 5: Employee B attempts to delete Employee A's timelog
  // Should fail with 403 Forbidden because:
  // - Employee B is not the timelog owner
  // - Employee B doesn't have 'time:manage' permission
  // - Employee B is in a different organization context
  await TestValidator.httpError(
    "Employee B cannot delete Employee A's timelog",
    403,
    async () => {
      await api.functional.erpHrm.member.timelogs.erase(employeeBConnection, {
        timelogId: timelog.id,
      });
    },
  );
}

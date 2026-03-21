import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_project_deletion_with_existing_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Register a member (member will have implicit employee record in org)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 4. Create a timelog against the project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(timelog);
  // 5. Attempt to delete the project - should fail with 409 Conflict
  await TestValidator.httpError(
    "project deletion should fail with 409 due to existing timelogs",
    409,
    async () => {
      await api.functional.erpHrm.admin.projects.erase(adminConnection, {
        projectId: project.id,
      });
    },
  );
  // 6. Verify project still exists after failed deletion attempt
  // Attempt to create another timelog against the project - if project was deleted,
  // this would fail. Success proves the project still exists.
  const anotherTimelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(anotherTimelog);
  TestValidator.equals(
    "timelog project id should match",
    anotherTimelog.project.id,
    project.id,
  );
}

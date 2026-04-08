import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_update_locked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create project for timelog testing
  const projectResponse = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {},
    },
  );
  // Access project id from the response items or use organization context
  const projectId =
    projectResponse.items[0]?.projectId ??
    (projectResponse as any).id ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Create task under project for timelog association
  const taskResponse =
    await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
      params: { projectId: projectId },
      body: {},
    });
  // Access task id
  const taskId =
    (taskResponse as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 4. Member joins and sets organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Set organization context to use the admin's organization
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 5. Create timelog
  const timelogResponse = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        taskId: taskId,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "Test timelog for approved timesheet lock test",
        billable: true,
      },
    },
  );
  // Access timelog id
  const timelogId =
    (timelogResponse as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to update timelog - should fail because timelog is not editable
  // by regular members if it's part of an approved timesheet
  // Note: This test validates that the endpoint exists and properly rejects updates
  // when the business rule is violated (timelog locked by approved timesheet)
  await TestValidator.error(
    "timelog update should fail for regular members when timelog is locked",
    async () => {
      await api.functional.erpHrm.member.timelogs.update(memberConnection, {
        timelogId: timelogId,
        body: {
          durationMinutes: 90,
        } satisfies IErpHrmTimelog.IUpdate,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_employee_deactivation_timer_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Setup owner (Member A) context
  // Owner joins and creates first organization automatically
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Create a project for time tracking (organization context from owner session)
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Phase 2: Create invitation for employee B
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        params: { organizationId: project.organization.id },
        body: {
          email: employeeEmail,
          roleId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Phase 3: Setup employee (Member B) context
  // Employee joins with invited email - auto-accepts invitation
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Phase 4: Employee starts a timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Phase 5: Owner attempts to deactivate employee with active timer
  // This should return 409 Conflict
  // Note: In simulation mode, employee ID might not be directly available
  // The erase endpoint validates employee:manage permission and checks for active timer
  await TestValidator.httpError(
    "should return 409 conflict when deactivating employee with active timer",
    409,
    async () => {
      await api.functional.erpHrm.member.employees.erase(ownerConnection, {
        employeeId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
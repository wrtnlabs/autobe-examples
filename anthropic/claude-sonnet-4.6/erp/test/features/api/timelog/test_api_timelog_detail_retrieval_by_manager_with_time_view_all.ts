import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_detail_retrieval_by_manager_with_time_view_all(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Member A (owner/manager) ───────────────────────────
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // ─── Step 2: Create organization (Member A becomes Owner with all permissions) ───
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // ─── Step 3: Create a custom role with project:manage permission for Member B ───
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: `employee-role-${RandomGenerator.alphaNumeric(6)}`,
          permissions: ["project:manage"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // ─── Step 4: Register Member B (the employee) ────────────────────────────
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // ─── Step 5: Add Member B to the organization with the custom role ────────
  const memberBOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuth.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(memberBOrgMember);
  // ─── Step 6: Create a project (as Member A) ──────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // ─── Step 7: Assign Member B as a project member ─────────────────────────
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        body: {
          organizationMemberId: memberBOrgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // ─── Step 8: Create a timelog as Member B ────────────────────────────────
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberBConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2025-03-10T00:00:00.000Z").toISOString(),
        duration_minutes: 120,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // ─── Test Execution: Member A retrieves Member B's timelog ───────────────
  const retrieved = await api.functional.erpHrm.member.timelogs.at(
    memberAConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrieved);
  // ─── Validation ──────────────────────────────────────────────────────────
  // Validate the timelog id matches
  TestValidator.equals("timelog id matches", retrieved.id, timelog.id);
  // Validate owner is Member B (not Member A)
  TestValidator.equals(
    "timelog owner org member id matches Member B",
    retrieved.owner.id,
    memberBOrgMember.id,
  );
  TestValidator.equals(
    "timelog owner email matches Member B email",
    retrieved.owner.member.email,
    memberBEmail,
  );
  // Validate project matches
  TestValidator.equals(
    "timelog project id matches",
    retrieved.project.id,
    project.id,
  );
  // Validate duration_minutes
  TestValidator.equals(
    "duration_minutes is 120",
    retrieved.duration_minutes,
    120,
  );
  // Validate billable is true
  TestValidator.predicate("billable is true", retrieved.billable === true);
  // Validate task is null
  TestValidator.equals("task is null", retrieved.task, null);
  // Validate timesheet is null
  TestValidator.equals("timesheet is null", retrieved.timesheet, null);
  // Validate locked is false
  TestValidator.predicate("locked is false", retrieved.locked === false);
}

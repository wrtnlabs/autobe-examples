import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_creation_unauthorized_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register owner (first member) ───
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // ─── Step 2: Create organization (owner becomes the org owner with project:manage) ───
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ─── Step 3: Register second member (employee) ───
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // ─── Step 4: Add employee to the organization ───
  // Use owner's connection to add the employee member.
  // Pass the employee's platform member ID; let the generate function pick a role.
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // ─── Step 5: Switch employee's active organization context ───
  const switchedMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      employeeConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedMember);
  // ─── Step 6: Test 403 — employee without project:manage cannot create project ───
  await TestValidator.httpError(
    "employee without project:manage cannot create project",
    403,
    async () => {
      await generate_random_erp_hrm_member_projects_create(employeeConnection, {
        body: {
          name: "Unauthorized Project",
          color: "#2ECC71",
        },
      });
    },
  );
  // ─── Step 7: Owner CAN create a project (contrast verification) ───
  const ownerProject = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: "Authorized Project",
        color: "#3498DB",
      },
    },
  );
  typia.assert(ownerProject);
  // Validate the owner's project belongs to the correct organization
  TestValidator.equals(
    "owner project belongs to the organization",
    ownerProject.organization_id,
    organization.id,
  );
}

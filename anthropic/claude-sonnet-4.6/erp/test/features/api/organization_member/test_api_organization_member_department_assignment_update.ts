import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_department_assignment_update(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register the owner member and create an organization ───────────
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ── Step 2: Create "Engineering" department in the owner's organization ────
  const engineeringDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        body: { name: "Engineering" },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(engineeringDept);
  // ── Step 3: Register a second member (the employee) ───────────────────────
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // ── Step 4: Add the second member to the organization (no dept) ───────────
  // Owner adds the employee; owner has employee:manage permission
  const ownerOrgMemberId = organization.owner.id; // owner's org member id
  const ownerRoleId = organization.owner.role.id; // owner's role id
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
          departmentId: null,
          position: null,
        },
      },
    );
  typia.assert(employeeOrgMember);
  // ── Step 5: Update the employee's department assignment ───────────────────
  const updateBody = {
    department_id: engineeringDept.id,
    position: "Backend Developer",
    employment_type: "full-time",
  } satisfies IErpHrmOrganizationMember.IUpdate;
  const updatedMember =
    await api.functional.erpHrm.member.organizationMembers.update(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);
  // ── Step 6: Validate the update response ──────────────────────────────────
  TestValidator.predicate(
    "department is not null after update",
    updatedMember.department !== null,
  );
  TestValidator.equals(
    "department id matches",
    updatedMember.department!.id,
    engineeringDept.id,
  );
  TestValidator.equals(
    "department name matches",
    updatedMember.department!.name,
    "Engineering",
  );
  TestValidator.equals(
    "position matches",
    updatedMember.position,
    "Backend Developer",
  );
  TestValidator.equals(
    "employment_type matches",
    updatedMember.employment_type,
    "full-time",
  );
  // ── Step 7: Persistence check via GET ────────────────────────────────────
  const fetchedMember =
    await api.functional.erpHrm.member.organizationMembers.at(ownerConnection, {
      organizationMemberId: employeeOrgMember.id,
    });
  typia.assert(fetchedMember);
  TestValidator.predicate(
    "fetched department is not null",
    fetchedMember.department !== null,
  );
  TestValidator.equals(
    "fetched department id matches",
    fetchedMember.department!.id,
    engineeringDept.id,
  );
  TestValidator.equals(
    "fetched department name matches",
    fetchedMember.department!.name,
    "Engineering",
  );
  TestValidator.equals(
    "fetched position matches",
    fetchedMember.position,
    "Backend Developer",
  );
  // ── Step 8: Cross-org edge case — should be rejected ─────────────────────
  // Register a third member and create a second org/dept
  const owner2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(owner2Connection, {});
  const organization2 =
    await generate_random_erp_hrm_member_organizations_create(
      owner2Connection,
      {},
    );
  typia.assert(organization2);
  const otherOrgDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      owner2Connection,
      {
        body: { name: "Marketing" },
        params: { organizationId: organization2.id },
      },
    );
  typia.assert(otherOrgDept);
  // Attempt to assign the employee in org1 to a department from org2 — must fail
  await TestValidator.error(
    "cross-org department assignment should be rejected",
    async () => {
      await api.functional.erpHrm.member.organizationMembers.update(
        ownerConnection,
        {
          organizationMemberId: employeeOrgMember.id,
          body: {
            department_id: otherOrgDept.id,
          } satisfies IErpHrmOrganizationMember.IUpdate,
        },
      );
    },
  );
}

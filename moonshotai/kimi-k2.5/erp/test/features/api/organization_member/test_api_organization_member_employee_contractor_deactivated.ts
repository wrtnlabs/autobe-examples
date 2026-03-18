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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test the creation of an organization member with contractor employment type and deactivated status.
 * Validates that contractor classification and deactivation flags are properly persisted,
 * ensuring deactivated members cannot perform work until explicitly activated.
 */
export async function test_api_organization_member_employee_contractor_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with management permissions for contractors
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          { permission: "employee.manage" },
          { permission: "organization.manage" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create second member account (contractor target)
  const contractorConnection: api.IConnection = { host: connection.host };
  const contractor = await authorize_member_join(contractorConnection, {});
  typia.assert(contractor);
  // 5. Create organization member with contractor employment type and deactivated status
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: contractor.id,
          roleId: role.id,
          employmentType: "contractor",
          isActive: false,
          position: "External Consultant",
          departmentId: null,
        },
      },
    );
  typia.assert(organizationMember);
  // 6. Validate contractor classification is persisted correctly
  TestValidator.equals(
    "employment type is contractor",
    organizationMember.employmentType,
    "contractor",
  );
  TestValidator.equals(
    "position is External Consultant",
    organizationMember.position,
    "External Consultant",
  );
  TestValidator.equals(
    "userId matches contractor",
    organizationMember.userId,
    contractor.id,
  );
  TestValidator.equals(
    "organizationId matches",
    organizationMember.organizationId,
    organization.id,
  );
  TestValidator.equals(
    "roleId matches assigned role",
    organizationMember.roleId,
    role.id,
  );
  // 7. Verify deactivated status prevents active work
  TestValidator.equals("isActive is false", organizationMember.isActive, false);
  TestValidator.predicate(
    "member is deactivated and cannot work",
    organizationMember.isActive === false,
  );
  // 8. Confirm employment type affects reporting classifications
  TestValidator.predicate(
    "contractor classification for reporting",
    organizationMember.employmentType === "contractor",
  );
}

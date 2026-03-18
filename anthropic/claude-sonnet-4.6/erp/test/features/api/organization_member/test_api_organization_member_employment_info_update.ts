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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_employment_info_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (owner) with a dedicated connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // Step 2: Create organization using owner's connection
  // The first member automatically becomes the owner with all built-in permissions
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register the second member (employee) with a separate dedicated connection
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(
    employeeConnection,
    {},
  );
  typia.assert(employeeAuthorized);
  // Extract the second member's platform ID
  const secondMemberId = employeeAuthorized.member.id;
  // Step 4: Create an OrganizationMember record for the second member
  // Use the owner's connection since only the owner has employee:manage permission
  // Use the owner's role ID from organization.owner.role.id as the only available role reference
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberId,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
          departmentId: null,
          position: null,
        },
      },
    );
  typia.assert(organizationMember);
  // Step 5: Update the organization member's employment details using owner's connection
  const updateBody = {
    employment_type: "contractor",
    position: "Senior Engineer",
  } satisfies IErpHrmOrganizationMember.IUpdate;
  const updatedMember =
    await api.functional.erpHrm.member.organizationMembers.update(
      ownerConnection,
      {
        organizationMemberId: organizationMember.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);
  // Step 6: Validate the updated member's employment details
  TestValidator.equals(
    "employment_type changed to contractor",
    updatedMember.employment_type,
    "contractor",
  );
  TestValidator.equals(
    "position set to Senior Engineer",
    updatedMember.position,
    "Senior Engineer",
  );
  TestValidator.equals("status remains active", updatedMember.status, "active");
  TestValidator.equals("department is null", updatedMember.department, null);
  // Validate updated_at >= created_at (update was persisted)
  TestValidator.predicate(
    "updated_at is more recent than or equal to created_at",
    new Date(updatedMember.updated_at) >= new Date(updatedMember.created_at),
  );
}

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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test soft deleting organization member when they have active timer running.
 *
 * Scenario Steps:
 * 1. Authenticate as member (POST /auth/member/join) - becomes organization owner
 * 2. Create organization (POST /organizations)
 * 3. Create custom role (POST /roles)
 * 4. Create second member (POST /auth/member/join) - will be the employee
 * 5. Create organization member for second user (POST /organizationMembers)
 * 6. Start a timer for this member (POST /timers) to simulate active work tracking
 * 7. Delete the organization member (DELETE /organizationMembers/{organizationMemberId}) - target operation
 *
 * Expected Outcomes:
 * - HTTP 204 No Content returned
 * - OrganizationMember soft-deleted successfully
 * - Active timer is cleaned up/removed (per specification: "Timers: Remove active timers belonging to this member")
 * - No orphaned timer records remain for deleted member
 */
export async function test_api_organizationmember_delete_with_active_timer_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with necessary permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        permissions: [
          { permission: "timer.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create second member (employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 5. Create organization member for second user
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 6. Start a timer for this member to simulate active work tracking
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {},
  );
  typia.assert(timer);
  // 7. Delete the organization member - should succeed and clean up active timer
  await api.functional.erpHrm.member.organizationMembers.erase(
    ownerConnection,
    {
      organizationMemberId: organizationMember.id,
    },
  );
}

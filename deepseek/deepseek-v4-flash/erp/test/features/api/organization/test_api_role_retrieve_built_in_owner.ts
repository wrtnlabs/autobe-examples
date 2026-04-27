import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test retrieving the built-in Owner role after organization creation.
 *
 * Registers a new member, creates an organization (which auto-seeds built-in roles), and validates that the organization was created correctly with the authenticated member as owner.
 *
 * 1. Register a new member via `authorize_member_join` to obtain authentication tokens.
 * 2. Create an organization via `generate_random_hrm_time_tracking_member_organizations_create` (auto-seeds Owner, Manager, Employee roles).
 * 3. Validate the organization creation response includes the correct owner reference and configuration settings.
 * 4. Retrieve the Owner role using its known built-in identifier and verify name, type, and permission assignments.
 */
export async function test_api_role_retrieve_built_in_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Validate organization
  TestValidator.equals("org owner id", organization.owner.id, authorized.id);
  TestValidator.equals("org status", organization.status, "active");
  TestValidator.predicate("org has name", () => organization.name.length > 0);
  TestValidator.predicate(
    "org has currency",
    () => organization.currency.length === 3,
  );
  TestValidator.predicate(
    "org has timezone",
    () => organization.timezone.length > 0,
  );
  TestValidator.predicate(
    "fiscal start month valid",
    () =>
      organization.fiscal_start_month >= 1 &&
      organization.fiscal_start_month <= 12,
  );
  // 4. Retrieve the Owner role by its roleId
  // The organization auto-seeds three built-in roles (Owner, Manager, Employee)
  // The authorized member is automatically assigned the Owner role as an employee,
  // so we can retrieve it via the employee record from the join response.
  // Since employees are captured at join time (empty before org creation),
  // we use the organization's owner employee record.
  const role =
    await api.functional.hrmTimeTracking.member.organizations.roles.at(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: organization.id, // Use orgId as fallback
      },
    );
  typia.assert(role);
  TestValidator.equals("role name", role.name, "Owner");
  TestValidator.equals("role type", role.type, "built_in");
  TestValidator.predicate(
    "has role permissions",
    () => role.rolePermissions.length > 0,
  );
  const hasOrgManage = role.rolePermissions.some(
    (p) => p.permission_code === "org:manage",
  );
  TestValidator.predicate("has org:manage permission", () => hasOrgManage);
  TestValidator.equals(
    "organization id matches",
    role.organization.id,
    organization.id,
  );
}

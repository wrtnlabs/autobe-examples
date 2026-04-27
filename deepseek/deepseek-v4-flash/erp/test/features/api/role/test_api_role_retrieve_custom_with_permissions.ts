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
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_retrieve_custom_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with specific permissions
  const createdRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "CustomAuditor",
          permissions: ["time:view_all", "report:view"],
        } satisfies DeepPartial<IHrmTimeTrackingRole.ICreate>,
      },
    );
  typia.assert(createdRole);
  // 4. Retrieve the role by ID
  const retrievedRole =
    await api.functional.hrmTimeTracking.member.organizations.roles.at(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
      },
    );
  typia.assert(retrievedRole);
  // 5. Validate
  TestValidator.equals(
    "role name matches",
    retrievedRole.name,
    "CustomAuditor",
  );
  TestValidator.equals("role type is custom", retrievedRole.type, "custom");
  TestValidator.equals(
    "role belongs to correct organization",
    retrievedRole.organization.id,
    organization.id,
  );
  const permissionCodes = retrievedRole.rolePermissions
    .map((p) => p.permission_code)
    .sort();
  TestValidator.equals("permissions match", permissionCodes, [
    "report:view",
    "time:view_all",
  ]);
  for (const perm of retrievedRole.rolePermissions) {
    TestValidator.predicate(
      `permission ${perm.permission_code} is active`,
      perm.deleted_at === null,
    );
  }
}

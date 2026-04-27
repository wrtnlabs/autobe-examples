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
import { generate_random_hrm_time_tracking_member_organizations_roles_permissions_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_permissions_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_permission_assign_new(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test assigning a new permission code to a custom role for the first time.
   *
   * Validates the complete workflow of assigning a system permission to a custom role within an organization. The test verifies that the role-permission mapping is correctly created with the expected permission code and role reference, and that system-generated fields like the record ID and timestamps are properly set.
   *
   * 1. Register a new member account via {@link authorize_member_join}.
   * 2. Create an organization via the generation utility — the member becomes the Owner with implicit {@code org:manage} permission.
   * 3. Create a custom role with the initial permission {@code employee:view}.
   * 4. Assign the new permission {@code time:manage} to the custom role.
   * 5. Validate that the response is a well-formed {@link IHrmTimeTrackingRolePermission} entity with the correct permission code and role reference.
   */
  // 1. Register a new member (authenticated)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization (member becomes Owner with org:manage)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with initial permission 'employee:view'
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          permissions: ["employee:view"],
        },
      },
    );
  typia.assert(role);
  // 4. Assign a new permission code 'time:manage' to the custom role
  const permission =
    await generate_random_hrm_time_tracking_member_organizations_roles_permissions_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
        body: {
          permission_code: "time:manage",
        },
      },
    );
  typia.assert(permission);
  // 5. Validate business logic (typia.assert already validates types)
  TestValidator.equals(
    "permission code matches",
    permission.permission_code,
    "time:manage",
  );
  TestValidator.equals("role id matches", permission.role.id, role.id);
}

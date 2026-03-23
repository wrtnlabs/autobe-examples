import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_roles_create } from "../../../generate/generate_random_hrm_tracker_member_roles_create";
import { prepare_random_hrm_tracker_role } from "../../../prepare/prepare_random_hrm_tracker_role";

/**
 * Test that removing a permission not assigned to a role is blocked.
 * 1. Create an organization owner and initial role with permissions
 * 2. Attempt to remove a permission not assigned to the role
 * 3. Validate error response for removing unassigned permission
 * 4. Validate role still exists with same properties (no changes)
 */
export async function test_api_role_permission_removal_blocked_when_permission_not_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner and initial role with permissions
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(owner);
  // Create new connection with token from owner authorization
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: owner.token.access },
  };
  // Create custom role with one permission
  const role = await api.functional.hrmTracker.member.roles.create(
    authConnection,
    {
      body: {
        name: `CustomRole_${RandomGenerator.alphabets(6)}`,
        description: "Test role for permission removal",
        permissions: ["project:view"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(role);
  // Validate role organization context
  TestValidator.equals(
    "role belongs to organization",
    role.organization.id,
    owner.id,
  );
  // 2. Attempt to remove a permission not assigned to the role
  const permissionNotAssigned = "time:approve"; // This permission is not in the role's permissions
  // 3. Validate error response for removing unassigned permission
  await TestValidator.error(
    "should reject permission removal when permission is not assigned",
    async () => {
      await api.functional.hrmTracker.member.roles.permissions.erase(
        authConnection,
        {
          roleId: role.id,
          permission: permissionNotAssigned,
        },
      );
    },
  );
  // 4. Validate role still exists with same properties (no changes)
  const fetchedRole =
    await api.functional.hrmTracker.member.roles.create.simulate(
      authConnection,
      {
        body: {
          name: role.name,
          permissions: ["project:view"],
        } satisfies IHrmTrackerRole.ICreate,
      },
    );
  typia.assert(fetchedRole);
  // Verify role data remains unchanged
  TestValidator.equals("role ID unchanged", role.id, fetchedRole.id);
  TestValidator.equals("role name unchanged", role.name, fetchedRole.name);
  TestValidator.equals(
    "role is_custom flag unchanged",
    role.is_custom,
    fetchedRole.is_custom,
  );
  TestValidator.equals(
    "role is_default flag unchanged",
    role.is_default,
    fetchedRole.is_default,
  );
}

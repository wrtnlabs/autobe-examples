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

export async function test_api_role_permission_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(owner);
  // Update owner connection with token from registration
  const ownerTokenConnection: api.IConnection = { host: connection.host };
  ownerTokenConnection.headers = {
    Authorization: owner.token.access,
  };
  // 2. Create a custom role with permissions
  const customRole = await api.functional.hrmTracker.member.roles.create(
    ownerTokenConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: "Custom role for testing permission removal",
        permissions: ["project:read", "project:write", "time:approve"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 3. Create an employee and assign to the custom role
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // Assign role to employee using owner's token connection
  await api.functional.hrmTracker.member.employees.role.assign(
    ownerTokenConnection,
    {
      employeeId: employee.id,
      body: {
        role_id: customRole.id,
      } satisfies IHrmTrackerEmployee.IAssign,
    },
  );
  // 4. Remove a permission from the custom role
  const removedPermission = "time:approve";
  await api.functional.hrmTracker.member.roles.permissions.erase(
    ownerTokenConnection,
    {
      roleId: customRole.id,
      permission: removedPermission,
    },
  );
  // 5. Verify the role structure after permission removal
  const fetchedRole = await api.functional.hrmTracker.member.roles.create(
    ownerTokenConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: "Verify role structure",
        permissions: ["project:read", "project:write"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(fetchedRole);
}

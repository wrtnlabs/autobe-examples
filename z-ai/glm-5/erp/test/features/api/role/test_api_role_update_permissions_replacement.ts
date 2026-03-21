import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_update_permissions_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner (has org:manage permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role with initial permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        permissions: ["org:manage", "employee:manage", "project:manage"],
      },
    },
  );
  typia.assert(role);
  // Verify initial permissions
  TestValidator.equals("initial permissions count", role.permissions.length, 3);
  TestValidator.predicate(
    "has org:manage initially",
    role.permissions.includes("org:manage"),
  );
  TestValidator.predicate(
    "has employee:manage initially",
    role.permissions.includes("employee:manage"),
  );
  TestValidator.predicate(
    "has project:manage initially",
    role.permissions.includes("project:manage"),
  );
  // 3. Update role with completely different permissions
  const updatedRole = await api.functional.erpHrm.member.roles.update(
    ownerConnection,
    {
      roleId: role.id,
      body: {
        name: `${role.name}_updated`,
        permissions: ["time:manage", "time:approve", "report:view"],
      } satisfies IErpHrmRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 4. Verify replacement semantics - ONLY new permissions
  TestValidator.equals(
    "new permissions count",
    updatedRole.permissions.length,
    3,
  );
  TestValidator.predicate(
    "has time:manage",
    updatedRole.permissions.includes("time:manage"),
  );
  TestValidator.predicate(
    "has time:approve",
    updatedRole.permissions.includes("time:approve"),
  );
  TestValidator.predicate(
    "has report:view",
    updatedRole.permissions.includes("report:view"),
  );
  // Verify original permissions are NOT present
  TestValidator.predicate(
    "org:manage removed",
    !updatedRole.permissions.includes("org:manage"),
  );
  TestValidator.predicate(
    "employee:manage removed",
    !updatedRole.permissions.includes("employee:manage"),
  );
  TestValidator.predicate(
    "project:manage removed",
    !updatedRole.permissions.includes("project:manage"),
  );
  // 5. Update with empty permissions array
  const emptyRole = await api.functional.erpHrm.member.roles.update(
    ownerConnection,
    {
      roleId: role.id,
      body: {
        permissions: [],
      } satisfies IErpHrmRole.IUpdate,
    },
  );
  typia.assert(emptyRole);
  // 6. Verify role has no permissions
  TestValidator.equals(
    "empty permissions count",
    emptyRole.permissions.length,
    0,
  );
}

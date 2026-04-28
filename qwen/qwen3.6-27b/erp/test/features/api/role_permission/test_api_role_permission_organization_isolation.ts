import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_roles_role_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_role_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test cross-organization data isolation for role-permission mappings.
 *
 * Validates that role-permission data cannot be accessed across organization boundaries in a multi-tenant ERP HRM platform. Members belonging to one organization cannot retrieve role-permission records from another organization, ensuring multi-tenant data isolation is properly enforced on the role-permission resource.
 *
 * 1. Authenticate as Member 1 to establish Organization 1 context.
 * 2. Create a custom role within Organization 1.
 * 3. Grant a permission key (time:approve) to the custom role, creating a role-permission mapping in Organization 1.
 * 4. Authenticate as Member 2 to establish Organization 2 context.
 * 5. Attempt to retrieve the Organization 1 role-permission record using Member 2's authentication session.
 * 6. Validate that the endpoint returns 404 Not Found, confirming that members cannot access role-permission data from organizations they do not belong to.
 */
export async function test_api_role_permission_organization_isolation(
  connection: api.IConnection,
) {
  // 1. Join Member 1 (creates Organization 1)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create a custom role in Organization 1
  const role = await generate_random_hrm_platform_member_roles_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: ["time:approve"],
      },
    },
  );
  typia.assert(role);
  // 3. Create a role-permission mapping in Organization 1
  const rolePermission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      member1Connection,
      {
        body: {
          permissionKey: "time:approve",
        },
        params: {
          roleId: role.id,
        },
      },
    );
  typia.assert(rolePermission);
  // 4. Join Member 2 (creates Organization 2)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  // 5. Attempt to retrieve Organization 1 role-permission using Member 2's session
  await TestValidator.httpError(
    "cross-organization role-permission isolation",
    404,
    async () => {
      await api.functional.hrmPlatform.member.roles.role_permissions.at(
        member2Connection,
        {
          roleId: role.id,
          rolePermissionId: rolePermission.id,
        },
      );
    },
  );
}

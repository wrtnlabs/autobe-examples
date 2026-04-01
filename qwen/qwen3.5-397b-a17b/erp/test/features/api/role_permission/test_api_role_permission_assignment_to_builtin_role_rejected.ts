import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_permissions_create";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test that built-in roles cannot have their permissions modified.
 *
 * This test validates the business rule that system-defined roles
 * (Owner, Manager, Employee with is_builtin=true) cannot have their
 * permissions modified. The test:
 * 1. Registers a new member account
 * 2. Retrieves the list of roles to find a built-in role
 * 3. Attempts to add a permission to the built-in role
 * 4. Verifies the operation is rejected with 403 Forbidden
 */
export async function test_api_role_permission_assignment_to_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve roles to find a built-in role
  const roles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_builtin: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(roles);
  // Verify we have at least one built-in role
  TestValidator.predicate("has built-in roles", roles.data.length > 0);
  // Get the first built-in role
  const builtinRole = roles.data[0];
  TestValidator.equals("role is builtin", builtinRole.is_builtin, true);
  // 3. Attempt to add a permission to the built-in role
  // This should be rejected with 403 Forbidden
  await TestValidator.error(
    "built-in role permission modification rejected",
    async () => {
      await api.functional.hrmPlatform.member.roles.permissions.create(
        memberConnection,
        {
          roleId: builtinRole.id,
          body: {
            permission: "employee:view",
          } satisfies IHrmPlatformRolePermission.ICreate,
        },
      );
    },
  );
}

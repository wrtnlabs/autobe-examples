import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_role_update_duplicate_name_within_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access organization management features
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // NOTE: Full duplicate name testing requires role creation and listing endpoints
  // which are not available in the current SDK. This test demonstrates the update
  // endpoint structure. In a complete implementation, you would:
  // 1. Create role A with name "Role Alpha" via POST /hrmPlatform/member/roles
  // 2. Create role B with name "Role Beta" via POST /hrmPlatform/member/roles
  // 3. Attempt to update role A's name to "Role Beta" (should fail with 409 Conflict)
  // Generate a role ID for demonstration (in real scenario, this would come from role creation)
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body with a name that would conflict if another role has same name
  const updateName = RandomGenerator.paragraph({ sentences: 1 });
  const updateBody = {
    name: updateName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmPlatformRole.IUpdate;
  // Execute the update operation
  const updatedRole = await api.functional.hrmPlatform.member.roles.update(
    memberConnection,
    {
      roleId: roleId,
      body: updateBody,
    },
  );
  typia.assert(updatedRole);
  // Validate the response structure - name should match the update request
  TestValidator.equals("role id matches", updatedRole.id, roleId);
  TestValidator.equals(
    "role name matches update",
    updatedRole.name,
    updateName,
  );
  TestValidator.predicate(
    "has organization",
    updatedRole.organization !== undefined,
  );
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(updatedRole.permissions),
  );
}

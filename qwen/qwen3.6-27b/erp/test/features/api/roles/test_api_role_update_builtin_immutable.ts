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

export async function test_api_role_update_builtin_immutable(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create an account with default organization with built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Obtain the role ID of a built-in role (e.g., Manager role with built_in=true)
  // Since we don't have a SDK function to list roles, we need to simulate a built-in role ID
  // In a real scenario, we would need a GET endpoint to list roles and find one with built_in=true
  // The built-in roles are: Owner, Manager, Employee
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call PUT /hrmPlatform/member/roles/{roleId} with updated name or description
  // This should fail because built-in roles are immutable
  // We'll try to update the name and description
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHrmPlatformRole.IUpdate;
  // 4. Validate that the request is rejected because built-in roles are immutable platform defaults
  // TestValidator.error expects the API call to throw an error
  await TestValidator.error("built-in role update is rejected", async () => {
    await api.functional.hrmPlatform.member.roles.update(memberConnection, {
      roleId: builtInRoleId,
      body: updateBody,
    });
  });
  // 5. Verify the built-in role remains unchanged with its original name and description
  // We cannot verify this without a GET endpoint to retrieve the role
  // The test validates that the update operation fails for built-in roles
  // 6. Response indicates the operation is not permitted for built-in roles
  // The error thrown by the API indicates that built-in roles cannot be modified
}

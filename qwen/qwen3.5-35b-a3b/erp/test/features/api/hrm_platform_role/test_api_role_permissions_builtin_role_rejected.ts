import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_role_permissions_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(auth);
  // 2. Retrieve roles list to find a built-in role
  const rolesConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(rolesConnection, {
    body: {
      email: auth.email,
      password: auth.member.email,
    },
  });
  const rolesPage = await api.functional.hrmPlatform.member.roles.index(
    rolesConnection,
    {
      body: {
        role_kind: "built_in",
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesPage);
  // Find a built-in role
  const builtInRole = rolesPage.data.find(
    (role) => role.role_kind === "built_in",
  );
  if (!builtInRole) {
    throw new Error("No built-in role found in organization");
  }
  // 3. Attempt to update permissions of built-in role
  // This should fail with 400 or 403 error
  const updateConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(updateConnection, {
    body: {
      email: auth.email,
      password: auth.member.email,
    },
  });
  const permissionCodes = [
    "employee.view",
    "employee.manage",
  ] satisfies string[];
  // Validate that the operation returns HTTP error (400 or 403)
  await TestValidator.httpError(
    "built-in role permissions cannot be modified",
    [400, 403],
    async () => {
      await api.functional.hrmPlatform.member.roles.permissions.update(
        updateConnection,
        {
          roleId: builtInRole.id,
          body: {
            permissions: permissionCodes,
          } satisfies IHrmPlatformRole.IUpdate,
        },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_role_deletion_builtin_protected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member (becomes Owner of organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. List built-in roles to obtain the ID of a built-in role
  const rolesList = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        role_kind: "built_in",
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesList);
  TestValidator.predicate("built-in roles exist", rolesList.data.length > 0);
  // 3. Select the first built-in role for deletion attempt
  const builtInRole = rolesList.data[0];
  const roleId = builtInRole.id;
  // Verify the role is indeed a built-in role
  TestValidator.equals(
    "role_kind is built_in",
    builtInRole.role_kind,
    "built_in",
  );
  // 4. Attempt to delete the built-in role
  await TestValidator.error("built-in role deletion forbidden", async () => {
    await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
      roleId,
    });
  });
  // 5. Verify the role still exists and remains active after failed deletion attempt
  const rolesAfterDeletionAttempt =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        role_kind: "built_in",
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(rolesAfterDeletionAttempt);
  TestValidator.equals(
    "role still exists",
    rolesAfterDeletionAttempt.data.length,
    rolesList.data.length,
  );
  // Verify the specific role is still in the list
  const roleStillExists = rolesAfterDeletionAttempt.data.some(
    (role) => role.id === roleId,
  );
  TestValidator.predicate("built-in role still present", roleStillExists);
  // Verify the role's role_kind remains built_in
  const updatedRole = rolesAfterDeletionAttempt.data.find(
    (role) => role.id === roleId,
  )!;
  typia.assert(updatedRole);
  TestValidator.equals(
    "role_kind unchanged",
    updatedRole.role_kind,
    "built_in",
  );
}
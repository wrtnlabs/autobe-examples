import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_effective_permissions_resolution(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string,
      password: "Password123!" as string,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${joined.token.access}`,
  };
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.erpHrmTime.member.roles.effectivePermissions(
      memberConnection,
      { roleId },
    );
  typia.assert(output);
  TestValidator.equals("role id preserved", output.id, roleId);
  TestValidator.predicate("role name present", output.name.length > 0);
  TestValidator.predicate(
    "role has timestamps",
    output.createdAt.length > 0 && output.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "permissions array present",
    Array.isArray(output.permissions),
  );
  TestValidator.predicate(
    "permissions have entries",
    output.permissions.length >= 0,
  );
  const stableKeys = output.permissions.map((permission) => permission.key);
  const sortedKeys = [...stableKeys].sort();
  TestValidator.equals(
    "permissions are in stable order",
    stableKeys,
    sortedKeys,
  );
  for (const permission of output.permissions) {
    TestValidator.predicate(
      "permission id is present",
      permission.id.length > 0,
    );
    TestValidator.predicate(
      "permission key is present",
      permission.key.length > 0,
    );
    TestValidator.predicate(
      "permission description is present",
      permission.description.length > 0,
    );
  }
}

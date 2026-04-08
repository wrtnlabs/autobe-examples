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

export async function test_api_role_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "Str0ng!Passw0rd",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const expectedName = `${RandomGenerator.name(2)} Role`;
  const expectedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const expectedPermissions: IErpHrmTimePermission.ISummary[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      key: "org:manage",
      description: "Manage organization settings",
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      key: "employee:view",
      description: "View employee list and details",
    },
  ];
  const updatedRole = await api.functional.erpHrmTime.member.roles.update(
    memberConnection,
    {
      roleId,
      body: {
        name: expectedName,
        description: expectedDescription,
        permissions: expectedPermissions,
      } satisfies IErpHrmTimeRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  TestValidator.equals("role id preserved", updatedRole.id, roleId);
  TestValidator.equals("role name updated", updatedRole.name, expectedName);
  TestValidator.equals(
    "role description updated",
    updatedRole.description,
    expectedDescription,
  );
  TestValidator.equals(
    "role permissions resolved",
    updatedRole.permissions,
    expectedPermissions,
  );
  TestValidator.predicate(
    "role belongs to an organization",
    updatedRole.organization !== null && updatedRole.organization !== undefined,
  );
  TestValidator.predicate(
    "role remains active",
    updatedRole.deletedAt === null,
  );
}

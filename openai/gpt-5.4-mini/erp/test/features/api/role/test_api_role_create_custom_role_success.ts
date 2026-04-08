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
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_role_create_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email:
        `role-create-${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: "Password1234!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: `https://${RandomGenerator.alphabets(8)}.example.com/onboarding` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://${RandomGenerator.alphabets(8)}.example.com/referrer` satisfies string &
          tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const roleConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const permissions: IErpHrmTimePermission.ISummary[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      key: "org:manage",
      description: "Edit organization settings",
    },
  ];
  const request = {
    name: `custom-role-${RandomGenerator.alphabets(12)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    permissions,
  } satisfies IErpHrmTimeRole.ICreate;
  const role = await api.functional.erpHrmTime.member.roles.create(
    roleConnection,
    { body: request },
  );
  typia.assert(role);
  TestValidator.equals(
    "role name should match request",
    role.name,
    request.name,
  );
  TestValidator.equals(
    "role description should match request",
    role.description,
    request.description ?? null,
  );
  TestValidator.equals(
    "custom role should not be built-in",
    role.isBuiltin,
    false,
  );
  TestValidator.equals(
    "permission count should match request",
    role.permissions.length,
    permissions.length,
  );
  TestValidator.equals(
    "permission id should match request",
    role.permissions[0]?.id,
    permissions[0].id,
  );
  TestValidator.equals(
    "permission key should match request",
    role.permissions[0]?.key,
    permissions[0].key,
  );
  TestValidator.equals(
    "permission description should match request",
    role.permissions[0]?.description,
    permissions[0].description,
  );
  TestValidator.equals("role should not be deleted", role.deletedAt, null);
  TestValidator.equals(
    "created role should have a stable identifier",
    typeof role.id,
    "string",
  );
}

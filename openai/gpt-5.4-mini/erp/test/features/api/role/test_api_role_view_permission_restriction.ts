import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_role_view_permission_restriction(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(join);
  const role = await api.functional.erpHrmTime.member.roles.create(
    memberConnection,
    {
      body: {
        name: `Role ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:view",
            description: "View employee list and details",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const loaded = await api.functional.erpHrmTime.member.roles.at(
    memberConnection,
    {
      roleId: role.id,
    },
  );
  typia.assert(loaded);
  TestValidator.equals("role id", loaded.id, role.id);
  TestValidator.equals("role name", loaded.name, role.name);
  TestValidator.equals(
    "role description",
    loaded.description,
    role.description,
  );
  TestValidator.equals("role builtin flag", loaded.isBuiltin, role.isBuiltin);
  TestValidator.equals(
    "role permissions length",
    loaded.permissions.length,
    role.permissions.length,
  );
  TestValidator.equals(
    "organization-scoped role should preserve organization-bound payload",
    loaded.organization,
    role.organization,
  );
}

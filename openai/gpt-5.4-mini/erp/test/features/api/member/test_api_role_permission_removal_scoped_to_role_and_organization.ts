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

export async function test_api_role_permission_removal_scoped_to_role_and_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const createdRole = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: `perm_${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(createdRole);
  TestValidator.predicate(
    "created role has permissions",
    createdRole.permissions.length > 0,
  );
  const invalidRolePermissionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting a permission assignment from the wrong role or organization should fail",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: createdRole.id,
          rolePermissionId: invalidRolePermissionId,
        },
      );
    },
  );
  const followUpRole = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphabets(6)}_verify`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: `perm_${RandomGenerator.alphabets(6)}_verify`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(followUpRole);
  TestValidator.predicate(
    "follow-up role creation still works in active organization",
    followUpRole.permissions.length > 0,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
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
import { generate_random_erp_hrm_time_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_permissions_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";
import { prepare_random_erp_hrm_time_role_permission } from "../../../prepare/prepare_random_erp_hrm_time_role_permission";

export async function test_api_role_permission_assignment_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const permissions = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(permissions);
  TestValidator.predicate(
    "permission catalog should contain at least one approved permission",
    permissions.data.length > 0,
  );
  const permission = permissions.data[0];
  typia.assert(permission);
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const firstAssignment =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: {
          erpHrmTimePermissionId: permission.id,
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(firstAssignment);
  TestValidator.equals(
    "assigned permission should match the selected permission",
    firstAssignment.permission.id,
    permission.id,
  );
  TestValidator.equals(
    "assigned role should match the target role",
    firstAssignment.role.id,
    role.id,
  );
  await TestValidator.error(
    "duplicate role-permission assignment should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_roles_permissions_create(
        memberConnection,
        {
          params: { roleId: role.id },
          body: {
            erpHrmTimePermissionId: permission.id,
          } satisfies IErpHrmTimeRolePermission.ICreate,
        },
      );
    },
  );
}

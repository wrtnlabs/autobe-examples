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

export async function test_api_role_permission_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
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
  const permissionPage =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        sort: "key",
        order: "asc",
      } satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(permissionPage);
  TestValidator.predicate(
    "permission catalog should contain at least one approved permission",
    permissionPage.data.length > 0,
  );
  const permission = permissionPage.data[0];
  const assignment =
    await generate_random_erp_hrm_time_member_roles_permissions_create(
      memberConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          erpHrmTimePermissionId: permission.id,
        } satisfies IErpHrmTimeRolePermission.ICreate,
      },
    );
  typia.assert(assignment);
  TestValidator.equals("assignment role id", assignment.role.id, role.id);
  TestValidator.equals("assignment role name", assignment.role.name, role.name);
  TestValidator.equals(
    "assignment permission id",
    assignment.permission.id,
    permission.id,
  );
  TestValidator.equals(
    "assignment permission key",
    assignment.permission.key,
    permission.key,
  );
  TestValidator.predicate(
    "role response should include assigned permission in effective permissions",
    role.permissions.some((item) => item.id === permission.id),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_mismatched_role_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization to establish member as owner with permissions
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create Role A
  const roleA = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(roleA);
  // Create Role B
  const roleB = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(roleB);
  // Assign permission to Role A
  const permission =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        params: { roleId: roleA.id },
        body: {
          permission: "project.manage",
        } satisfies IErpHrmRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // Attempt to retrieve permission using Role B's ID should return 404
  await TestValidator.httpError(
    "should return 404 when permission belongs to different role",
    404,
    async () => {
      await api.functional.erpHrm.member.roles.permissions.at(
        memberConnection,
        {
          roleId: roleB.id,
          permissionId: permission.id,
        },
      );
    },
  );
  // Verify permission can be retrieved with correct Role A ID
  const retrievedPermission =
    await api.functional.erpHrm.member.roles.permissions.at(memberConnection, {
      roleId: roleA.id,
      permissionId: permission.id,
    });
  typia.assert(retrievedPermission);
  TestValidator.equals(
    "permission ID matches",
    retrievedPermission.id,
    permission.id,
  );
}

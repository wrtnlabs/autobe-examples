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

export async function test_api_role_permission_role_context_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Create organization to establish context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create custom role with specific name
  const roleName = "Data Integrity Test Role";
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: "Test role for data integrity verification",
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Assign one permission to the role
  const permission =
    await generate_random_erp_hrm_member_roles_permissions_create(
      memberConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission: "organization.view",
        } satisfies IErpHrmRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // 5. Retrieve the permission and verify nested role context
  const retrievedPermission =
    await api.functional.erpHrm.member.roles.permissions.at(memberConnection, {
      roleId: role.id,
      permissionId: permission.id,
    });
  typia.assert(retrievedPermission);
  // 6. Validate data integrity of nested role relationship
  TestValidator.equals(
    "role.id matches roleId path parameter",
    retrievedPermission.role.id,
    role.id,
  );
  TestValidator.equals(
    "role.name matches created role name",
    retrievedPermission.role.name,
    roleName,
  );
  TestValidator.equals(
    "role.is_builtin is false for custom role",
    retrievedPermission.role.is_builtin,
    false,
  );
  TestValidator.predicate(
    "role.permissions_count is at least 1",
    retrievedPermission.role.permissions_count >= 1,
  );
}

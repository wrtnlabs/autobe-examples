import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_role_builtin_update_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization — built-in roles (Owner, Manager, Employee) are auto-provisioned
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. List the built-in roles of the organization
  const rolesPage =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          is_builtin: true,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(rolesPage);
  // Ensure we have at least one built-in role
  TestValidator.predicate(
    "organization has built-in roles",
    rolesPage.data.length > 0,
  );
  // Pick the first built-in role to target
  const builtinRole = rolesPage.data[0]!;
  const originalName = builtinRole.name;
  const originalUpdatedAt = builtinRole.updated_at;
  const originalPermissions = builtinRole.permissions;
  // 4. Attempt to update the built-in role — must be rejected
  await TestValidator.httpError(
    "built-in role update must be rejected",
    [409, 422],
    async () => {
      await api.functional.erpHrm.member.organizations.roles.update(
        memberConnection,
        {
          organizationId: organization.id,
          roleId: builtinRole.id,
          body: {
            name: "Modified Built-in Role",
            permissionCodes: ["employee:view"],
          } satisfies IErpHrmRole.IUpdate,
        },
      );
    },
  );
  // 5. Re-read roles to verify the built-in role remains unchanged after rejection
  const rolesPageAfter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          is_builtin: true,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(rolesPageAfter);
  // Find the same built-in role in the re-read results
  const roleAfter = rolesPageAfter.data.find((r) => r.id === builtinRole.id);
  TestValidator.predicate(
    "built-in role still exists after rejected update",
    roleAfter !== undefined,
  );
  // Validate that name is unchanged
  TestValidator.equals(
    "built-in role name unchanged after rejected update",
    roleAfter!.name,
    originalName,
  );
  // Validate that updated_at is unchanged (no modification occurred)
  TestValidator.equals(
    "built-in role updated_at unchanged after rejected update",
    roleAfter!.updated_at,
    originalUpdatedAt,
  );
  // Validate that permission count is unchanged
  TestValidator.equals(
    "built-in role permission count unchanged after rejected update",
    roleAfter!.permissions.length,
    originalPermissions.length,
  );
}

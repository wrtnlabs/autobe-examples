import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_role_permissions_reduce_permission_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an organization for the member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select the organization as the active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals("organization matches", selectedOrg.id, organization.id);
  // 4. Create a custom role with all nine permissions
  const fullRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Role with full permissions for testing reduction",
        permissions: [
          "org:manage",
          "employee:manage",
          "employee:view",
          "project:manage",
          "project:view",
          "time:manage",
          "time:approve",
          "time:view_all",
          "report:view",
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(fullRole);
  TestValidator.equals(
    "initial permission count",
    fullRole.permissions.length,
    9,
  );
  // 5. Update the role's permissions to a minimal set (only employee:view)
  const updateResult =
    await api.functional.hrmPlatform.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: fullRole.id,
        body: {
          permissionCodes: ["employee:view"],
        } satisfies IHrmPlatformRole.IPermissionsUpdate,
      },
    );
  typia.assert(updateResult);
  // 6. Verify the response contains only the single permission specified
  TestValidator.equals(
    "permission code matches",
    updateResult.permission,
    "employee:view",
  );
  // 7. Confirm the permission update was applied correctly
  TestValidator.predicate(
    "permission is employee:view",
    updateResult.permission === "employee:view",
  );
  TestValidator.equals("role id matches", updateResult.role.id, fullRole.id);
  TestValidator.equals(
    "role name preserved",
    updateResult.role.name,
    fullRole.name,
  );
}
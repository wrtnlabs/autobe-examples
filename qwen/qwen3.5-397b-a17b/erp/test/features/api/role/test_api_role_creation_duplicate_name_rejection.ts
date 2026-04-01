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

/**
 * Test business logic validation for duplicate role name rejection.
 *
 * This test validates that the system enforces unique role names within an organization
 * and prevents custom roles from using built-in role names (Owner, Manager, Employee).
 *
 * Test Flow:
 * 1. Register new member and create organization context
 * 2. Create first custom role with unique name
 * 3. Attempt duplicate role name creation - should fail
 * 4. Attempt built-in role name creation - should fail
 */
export async function test_api_role_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select organization context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 4. Create first custom role with unique name
  const uniqueRoleName = `Custom Role ${RandomGenerator.alphabets(8)}`;
  const firstRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: uniqueRoleName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee:view", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(firstRole);
  TestValidator.equals("role name matches", firstRole.name, uniqueRoleName);
  TestValidator.predicate("is custom role", !firstRole.is_builtin);
  // 5. Test duplicate role name rejection (same name, different permissions)
  await TestValidator.error("duplicate role name rejected", async () => {
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: uniqueRoleName,
        description: "Different description for duplicate test",
        permissions: ["employee:manage", "project:manage"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // 6. Test built-in role name rejection (cannot use "Owner" for custom role)
  await TestValidator.error("built-in role name rejected", async () => {
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: "Owner",
        description: "Attempting to create custom role with built-in name",
        permissions: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // 7. Test another built-in role name rejection ("Manager")
  await TestValidator.error("Manager role name rejected", async () => {
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        name: "Manager",
        description: "Attempting to create custom role with Manager name",
        permissions: ["project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
}

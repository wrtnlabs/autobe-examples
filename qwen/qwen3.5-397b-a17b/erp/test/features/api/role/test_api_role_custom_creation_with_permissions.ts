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
 * Test the successful creation of a custom role within an organization.
 *
 * Workflow:
 * 1. Register a new member account with organization owner privileges
 * 2. Create an organization context for the member
 * 3. Select the organization to establish working context
 * 4. Create a custom role with unique name, description, and valid permissions
 * 5. Validate the role response contains all required fields
 * 6. Test with different permission combinations
 */
export async function test_api_role_custom_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create organization for the member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Select the organization context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "organization selected",
    selectedOrg.id,
    organization.id,
  );
  // Step 4: Create custom role with full permission set
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Custom Role ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(customRole);
  // Step 5: Validate role structure
  TestValidator.notEquals("role has unique id", customRole.id, organization.id);
  TestValidator.equals(
    "role belongs to organization",
    customRole.organization_id,
    organization.id,
  );
  TestValidator.equals("role is not builtin", customRole.is_builtin, false);
  TestValidator.predicate(
    "role has all permissions",
    customRole.permissions.length === 9,
  );
  TestValidator.predicate(
    "role has creation timestamp",
    customRole.created_at !== undefined,
  );
  TestValidator.predicate(
    "role has update timestamp",
    customRole.updated_at !== undefined,
  );
  // Step 6: Test with minimal permission set
  const minimalRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Minimal Role ${RandomGenerator.alphabets(6)}`,
        description: null,
        permissions: ["employee:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(minimalRole);
  TestValidator.equals(
    "minimal role has one permission",
    minimalRole.permissions.length,
    1,
  );
  TestValidator.equals(
    "minimal role is not builtin",
    minimalRole.is_builtin,
    false,
  );
  TestValidator.equals(
    "minimal role permission",
    minimalRole.permissions[0].permission,
    "employee:view",
  );
  // Step 7: Test with mixed permission combination
  const mixedRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Mixed Role ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["project:view", "time:approve", "report:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(mixedRole);
  TestValidator.equals(
    "mixed role has three permissions",
    mixedRole.permissions.length,
    3,
  );
  TestValidator.predicate(
    "mixed role has project:view",
    mixedRole.permissions.some((p) => p.permission === "project:view"),
  );
  TestValidator.predicate(
    "mixed role has time:approve",
    mixedRole.permissions.some((p) => p.permission === "time:approve"),
  );
  TestValidator.predicate(
    "mixed role has report:view",
    mixedRole.permissions.some((p) => p.permission === "report:view"),
  );
}

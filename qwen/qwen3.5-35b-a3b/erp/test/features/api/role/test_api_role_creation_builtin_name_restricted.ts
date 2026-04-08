import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test that custom roles cannot be created with built-in role names (Owner, Manager, Employee).
 *
 * Validates that the system enforces built-in role name restrictions and prevents
 * recreation of protected role names as custom roles. The test creates an initial
 * organization with the Owner role, then attempts to create custom roles using
 * the reserved names, verifying each attempt is rejected with appropriate error.
 *
 * 1. Register a new member account which creates an organization with Owner role.
 * 2. Attempt to create a custom role with name 'Owner' (built-in role).
 * 3. Attempt to create a custom role with name 'Manager' (built-in role).
 * 4. Attempt to create a custom role with name 'Employee' (built-in role).
 * 5. Verify all attempts are rejected with appropriate error response.
 * 6. Confirm the system enforces that built-in roles cannot be recreated as custom roles.
 */
export async function test_api_role_creation_builtin_name_restricted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member (creates organization with Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Attempt to create custom role with 'Owner' (built-in name)
  await TestValidator.error("built-in name Owner rejected", async () => {
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: "Owner",
        description: "Custom owner role",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // Step 3: Attempt to create custom role with 'Manager' (built-in name)
  await TestValidator.error("built-in name Manager rejected", async () => {
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: "Manager",
        description: "Custom manager role",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // Step 4: Attempt to create custom role with 'Employee' (built-in name)
  await TestValidator.error("built-in name Employee rejected", async () => {
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: "Employee",
        description: "Custom employee role",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // Step 5: Verify successful creation of a valid custom role (sanity check)
  const validRole = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Valid custom role",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(validRole);
  TestValidator.equals("role kind is custom", validRole.role_kind, "custom");
}
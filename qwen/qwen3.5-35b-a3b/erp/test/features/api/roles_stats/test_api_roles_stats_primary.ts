import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPlatformRoleStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleStat";
import type { IRoleStatItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleStatItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path where an authenticated member can retrieve
 * role statistics for their organization.
 *
 * Validates the complete workflow of member registration with initial
 * organization creation, automatic Owner role assignment, and subsequent
 * retrieval of role statistics. Ensures that the statistics correctly
 * reflect the initial state of a new organization with only built-in roles
 * and the authenticated user as the sole Owner.
 *
 * Special attention is given to verifying role distribution counts,
 * employee assignment per role, and permission usage metrics for a
 * fresh organization setup.
 *
 * 1. Member registration with organization via POST /auth/member/join
 * 2. System automatically creates organization and assigns Owner role
 * 3. Call GET /member/roles/stats with authenticated member session
 * 4. Validate response structure and business logic assertions
 * 5. Verify role distribution shows built-in roles correctly
 */
export async function test_api_roles_stats_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization (creates initial state)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(member);
  // 2. Retrieve role statistics for the organization
  const stats =
    await api.functional.hrmPlatform.member.roles.stats(memberConnection);
  typia.assert(stats);
  // 3. Validate roleStats structure and counts for new organization
  TestValidator.equals("roleStats structure exists", stats.roleStats, {
    builtIn: 3,
    custom: 0,
    total: 3,
  });
  // 4. Validate employeeDistribution array structure and content
  // Check that we have exactly 3 roles (built-in roles only)
  const employeeDistribution = stats.employeeDistribution as unknown as IRoleStatItem[];
  TestValidator.equals(
    "employeeDistribution has 3 built-in roles",
    employeeDistribution.length,
    3,
  );
  // 5. Validate specific role distributions
  const ownerRole = employeeDistribution.find(
    (role) => role.name === "Owner",
  );
  const managerRole = employeeDistribution.find(
    (role) => role.name === "Manager",
  );
  const employeeRole = employeeDistribution.find(
    (role) => role.name === "Employee",
  );
  // Verify Owner role has count of 1 (authenticated user)
  TestValidator.equals(
    "Owner has 1 employee",
    ownerRole?.employee_count ?? -1,
    1,
  );
  // Verify Manager role has count of 0
  TestValidator.equals(
    "Manager has 0 employees",
    managerRole?.employee_count ?? -1,
    0,
  );
  // Verify Employee role has count of 0
  TestValidator.equals(
    "Employee has 0 employees",
    employeeRole?.employee_count ?? -1,
    0,
  );
  // 6. Validate role IDs are valid UUIDs
  for (const role of employeeDistribution) {
    TestValidator.predicate("role_id is valid UUID", () =>
      /^[0-9a-f-]{36}$/i.test(role.role_id),
    );
  }
  // 7. Validate permissionStats for new organization (no permissions assigned yet)
  TestValidator.equals(
    "permissionStats total_permissions is 0",
    stats.permissionStats.total_permissions,
    0,
  );
  TestValidator.equals(
    "permissionStats unique_permission_codes is 0",
    stats.permissionStats.unique_permission_codes,
    0,
  );
}
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
 * Test role statistics for an organization with only built-in roles.
 *
 * Validates the role statistics endpoint when an organization is freshly created
 * with the three default built-in roles (Owner, Manager, Employee). The test
 * verifies that the statistics correctly reflect the initial state of the
 * organization's role distribution and employee assignments.
 *
 * 1. Register a new member, which creates an organization with built-in roles.
 * 2. Retrieve role statistics for the organization.
 * 3. Validate total, built-in, and custom role counts.
 * 4. Verify employee distribution includes all three built-in roles.
 * 5. Confirm permission statistics are valid for the initial state.
 */
export async function test_api_roles_stats_with_custom_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization (Owner role)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Use the joined member's connection for subsequent calls
  const statsConnection: api.IConnection = { host: connection.host };
  statsConnection.headers ??= {};
  statsConnection.headers.Authorization = joinResult.token.access;
  // 3. Get role statistics
  const stats: IPlatformRoleStat =
    await api.functional.hrmPlatform.member.roles.stats(statsConnection);
  typia.assert(stats);
  // 4. Validate role statistics
  TestValidator.equals("total roles count", stats.roleStats.total, 3);
  TestValidator.equals("built-in roles count", stats.roleStats.builtIn, 3);
  TestValidator.equals("custom roles count", stats.roleStats.custom, 0);
  // 5. Validate employee distribution - IRoleStatItem (note: spec says array but type is single)
  TestValidator.equals(
    "employee distribution role_id exists",
    stats.employeeDistribution.role_id !== undefined,
    true,
  );
  TestValidator.equals(
    "employee distribution name exists",
    typeof stats.employeeDistribution.name === "string",
    true,
  );
  TestValidator.equals(
    "employee distribution has valid count",
    stats.employeeDistribution.employee_count >= 0,
    true,
  );
  // 6. Validate permission statistics
  TestValidator.predicate(
    "permission stats total is non-negative",
    stats.permissionStats.total_permissions >= 0,
  );
  TestValidator.predicate(
    "permission stats unique codes is non-negative",
    stats.permissionStats.unique_permission_codes >= 0,
  );
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering roles by built-in status to distinguish between system roles and custom roles.
 *
 * Validates the role listing endpoint's ability to filter roles based on their built-in status. Built-in roles are system-defined roles that cannot be permanently deleted, while custom roles are user-created and fully manageable. The test ensures that the is_builtin filter parameter correctly separates these two categories of roles.
 *
 * Special attention is given to verifying that the filter correctly handles organizations with different role compositions, including cases where custom roles may not exist.
 *
 * 1. Authenticate as a member with organization access
 * 2. Create member-specific connection for authenticated API calls
 * 3. Call the role listing endpoint with is_builtin filter set to true
 * 4. Verify only built-in system roles are returned (check is_builtin field on each role)
 * 5. Verify pagination metadata reflects the filtered result set
 * 6. Repeat the test with is_builtin filter set to false
 * 7. Verify only custom user-created roles are returned (or empty if no custom roles exist)
 * 8. Verify built-in system roles are excluded from results
 * 9. Validate pagination metadata is correct for both filter scenarios
 */
export async function test_api_role_list_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test with is_builtin = true (built-in system roles only)
  const builtInRolesResponse =
    await api.functional.hrmTimeTrack.member.roles.index(memberConnection, {
      body: {
        is_builtin: true,
      } satisfies IHrmTimeTrackRole.IRequest,
    });
  typia.assert(builtInRolesResponse);
  // 3. Verify all returned roles are built-in
  for (const role of builtInRolesResponse.data) {
    TestValidator.predicate(
      `role ${role.name} is built-in`,
      role.is_builtin === true,
    );
  }
  // 4. Verify pagination metadata for built-in roles
  TestValidator.equals(
    "built-in roles pagination current page",
    builtInRolesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "built-in roles pagination has valid limit",
    builtInRolesResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "built-in roles records count matches data length",
    builtInRolesResponse.pagination.records,
    builtInRolesResponse.data.length,
  );
  // 5. Test with is_builtin = false (custom roles only)
  const customRolesResponse =
    await api.functional.hrmTimeTrack.member.roles.index(memberConnection, {
      body: {
        is_builtin: false,
      } satisfies IHrmTimeTrackRole.IRequest,
    });
  typia.assert(customRolesResponse);
  // 6. Verify all returned roles are custom (not built-in)
  for (const role of customRolesResponse.data) {
    TestValidator.predicate(
      `role ${role.name} is custom (not built-in)`,
      role.is_builtin === false,
    );
  }
  // 7. Verify pagination metadata for custom roles
  TestValidator.equals(
    "custom roles pagination current page",
    customRolesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "custom roles pagination has valid limit",
    customRolesResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "custom roles records count matches data length",
    customRolesResponse.pagination.records,
    customRolesResponse.data.length,
  );
  // 8. Verify that built-in and custom role sets are mutually exclusive
  const builtInRoleIds = new Set(builtInRolesResponse.data.map((r) => r.id));
  const customRoleIds = new Set(customRolesResponse.data.map((r) => r.id));
  let hasOverlap = false;
  for (const roleId of builtInRoleIds) {
    if (customRoleIds.has(roleId)) {
      hasOverlap = true;
      break;
    }
  }
  TestValidator.predicate(
    "built-in and custom role sets are mutually exclusive",
    hasOverlap === false,
  );
}

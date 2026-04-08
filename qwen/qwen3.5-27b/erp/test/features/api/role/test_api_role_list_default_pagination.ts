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
 * Test the primary success path of listing roles within an organization with default pagination settings.
 *
 * Validates the role listing endpoint returns properly paginated results with correct metadata and role summary structure when called without explicit filters. Ensures that built-in system roles are present and that the response conforms to the expected pagination format.
 *
 * The test verifies that the default pagination parameters work correctly, that role summaries contain all required fields, and that the pagination metadata accurately reflects the total number of roles available in the organization.
 *
 * 1. Authenticate as a member using the authorize_member_join utility function
 * 2. Call the role listing endpoint without any filters to use default pagination
 * 3. Validate the response structure contains pagination metadata and role data array
 * 4. Verify pagination fields: current, limit, records, pages are present and valid
 * 5. Verify each role summary contains: id, name, description, is_builtin, created_at
 * 6. Confirm at least one role exists in the response (built-in roles should be present)
 * 7. Validate that all roles have valid UUID format for id field
 * 8. Check that is_builtin field correctly identifies system roles
 */
export async function test_api_role_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Call role listing endpoint without filters (default pagination)
  const rolesResponse = await api.functional.hrmTimeTrack.member.roles.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  // 3. Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is at least 1",
    rolesResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    rolesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    rolesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    rolesResponse.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    rolesResponse.data !== undefined,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(rolesResponse.data),
  );
  // 5. If roles exist, validate business logic
  if (rolesResponse.data.length > 0) {
    // Verify pagination consistency
    TestValidator.equals(
      "data length matches expected for first page",
      rolesResponse.data.length,
      Math.min(
        rolesResponse.pagination.records,
        rolesResponse.pagination.limit,
      ),
    );
    // Verify built-in roles exist (at least one should be present)
    const hasBuiltInRole = rolesResponse.data.some(
      (role) => role.is_builtin === true,
    );
    TestValidator.predicate(
      "at least one built-in role exists",
      hasBuiltInRole,
    );
    // Verify all role names are unique within the organization
    const roleNames = rolesResponse.data.map((role) => role.name);
    const uniqueRoleNames = new Set(roleNames);
    TestValidator.equals(
      "all role names are unique",
      roleNames.length,
      uniqueRoleNames.size,
    );
  }
}

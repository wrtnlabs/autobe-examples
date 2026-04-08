import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackEffectivePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEffectivePermission";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member without an employee record receives empty permissions.
 *
 * Validates that when a member is authenticated but has no employee record in any organization, the effective permissions endpoint returns an empty array. This ensures proper handling of members who are registered but not assigned to any organization role.
 *
 * The test verifies that the system correctly handles the edge case where a member exists in the authentication system but has no organizational affiliation, preventing unauthorized access to organization-specific features.
 *
 * 1. Register a new member account with email and password authentication.
 * 2. The member is authenticated but has no employee record in any organization.
 * 3. Call the effective permissions endpoint for the authenticated member.
 * 4. Validate that the response contains an empty permissions array.
 */
export async function test_api_member_effective_permissions_no_employee_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call effective permissions endpoint (member has no employee record)
  const permissions: IHrmTimeTrackEffectivePermission =
    await api.functional.hrmTimeTrack.member.effective_permissions.at(
      memberConnection,
    );
  typia.assert(permissions);
  // 3. Validate that permissions array is empty
  TestValidator.equals(
    "permissions should be empty for member without employee record",
    permissions.value,
    [],
  );
}

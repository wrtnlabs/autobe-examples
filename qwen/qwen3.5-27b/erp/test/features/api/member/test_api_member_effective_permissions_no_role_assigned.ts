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
 * Test that an authenticated member with no role assigned receives an empty permissions array.
 *
 * Validates that when a member is authenticated but has no employee record or role assigned within an organization, the effective permissions endpoint returns an empty array. This ensures the system gracefully handles members without role-based access control configuration.
 *
 * The test registers a new member account, authenticates them, and then retrieves their effective permissions. Since no employee record or role assignment exists for this member, the response should contain an empty permissions array.
 *
 * 1. Register and authenticate a new member account.
 * 2. Call the effective permissions endpoint.
 * 3. Validate that the response contains an empty permissions array.
 */
export async function test_api_member_effective_permissions_no_role_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Retrieve effective permissions for the authenticated member
  const permissions: IHrmTimeTrackEffectivePermission =
    await api.functional.hrmTimeTrack.member.effective_permissions.at(
      memberConnection,
    );
  typia.assert(permissions);
  // 3. Validate that permissions array is empty (no role assigned)
  TestValidator.equals("permissions array is empty", permissions.value, []);
  TestValidator.predicate(
    "permissions value is an empty array",
    Array.isArray(permissions.value) && permissions.value.length === 0,
  );
}

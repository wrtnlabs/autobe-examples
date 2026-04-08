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
 * Test that an authenticated member receives the correct effective permissions response structure.
 *
 * Validates the effective permissions endpoint by registering a new member, authenticating them, and retrieving their effective permissions. The test verifies that the response contains the expected structure with a `value` property containing an array of permission codes.
 *
 * Since organization, employee, and role management APIs are not available in this test context, the member will likely receive an empty permissions array. The test focuses on validating the response structure and ensuring the authenticated member can successfully access the endpoint.
 *
 * 1. Register a new member account with email and password
 * 2. Authenticate the member using the join utility function
 * 3. Call GET /hrmTimeTrack/member/effective-permissions with the authenticated connection
 * 4. Validate the response structure contains a `value` property with a string array
 */
export async function test_api_member_effective_permissions_with_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve effective permissions for the authenticated member
  const permissions =
    await api.functional.hrmTimeTrack.member.effective_permissions.at(
      memberConnection,
    );
  typia.assert(permissions);
  // 3. Validate response structure
  TestValidator.predicate(
    "permissions value is an array",
    Array.isArray(permissions.value),
  );
  // 4. Validate that all permission codes are strings
  TestValidator.predicate(
    "all permission codes are strings",
    permissions.value.every((code) => typeof code === "string"),
  );
  // 5. Verify the member can access the endpoint (response received successfully)
  TestValidator.equals(
    "response contains value property",
    "value" in permissions,
    true,
  );
}

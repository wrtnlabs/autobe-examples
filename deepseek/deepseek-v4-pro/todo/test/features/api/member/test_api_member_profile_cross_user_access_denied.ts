import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cross-user profile access denial for member isolation.
 *
 * Validates that a member cannot retrieve another member's profile data. The
 * GET /todoApp/members/{memberId} endpoint is strictly scoped to the authenticated
 * member — the memberId path parameter must match the authenticated member's own ID.
 * Any cross-user access attempt must be rejected.
 *
 * 1. Register Member A through the join endpoint using authorize_member_join utility,
 *    capturing the returned memberId from the IAuthorized response.
 * 2. Register Member B on a separate connection with fresh authentication context,
 *    establishing a different authenticated session.
 * 3. While authenticated as Member B, attempt to retrieve Member A's profile by
 *    calling api.functional.todoApp.members.at with Member A's memberId in the path.
 * 4. Verify the request is denied — the server must throw an error because Member B
 *    is not authorized to access Member A's profile data.
 */
export async function test_api_member_profile_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B with a fresh connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify that the two members have different IDs
  TestValidator.notEquals("members have distinct IDs", memberA.id, memberB.id);
  // 3. Attempt cross-user access: Member B tries to retrieve Member A's profile
  await TestValidator.error("cross-user profile access denied", async () => {
    await api.functional.todoApp.members.at(memberBConnection, {
      memberId: memberA.id,
    });
  });
}

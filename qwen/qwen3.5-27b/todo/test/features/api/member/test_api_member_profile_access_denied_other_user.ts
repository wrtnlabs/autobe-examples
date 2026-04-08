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
 * Test that a member cannot access another member's profile due to data isolation policies.
 *
 * Validates the data privacy and isolation requirement that members can only access their own profile information. The test registers two separate member accounts, authenticates as the first member, and attempts to retrieve the second member's profile. The system should reject this cross-user access attempt with a 403 Forbidden error.
 *
 * This test ensures that the todo application properly enforces data isolation boundaries between member accounts, preventing unauthorized access to other users' private profile information.
 *
 * 1. Register and authenticate first member (Member A) with unique email and credentials.
 * 2. Register and authenticate second member (Member B) with unique email and credentials.
 * 3. While authenticated as Member A, attempt to retrieve Member B's profile by ID.
 * 4. Verify the system throws an HttpError with 403 Forbidden status code.
 * 5. Confirm the error indicates unauthorized access attempt to another member's data.
 */
export async function test_api_member_profile_access_denied_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first member (Member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register and authenticate second member (Member B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Verify members have different IDs
  TestValidator.notEquals("members have different IDs", memberA.id, memberB.id);
  // 4. Attempt to access Member B's profile while authenticated as Member A
  // This should fail with 403 Forbidden due to data isolation
  await TestValidator.httpError(
    "cross-user profile access denied",
    403,
    async () =>
      await api.functional.todoApp.members.at(memberAConnection, {
        memberId: memberB.id,
      }),
  );
}

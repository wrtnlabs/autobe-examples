import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session retrieval with another member's session ID to verify data isolation and privacy.
 *
 * Validates that members cannot access or view other members' authentication sessions. This test confirms that the authorization system properly enforces data isolation at the session level, ensuring that even with valid authentication, users can only view their own session data.
 *
 * The test follows the security principle of "least information disclosure" by returning 404 Not Found (rather than 403 Forbidden) when attempting to access another member's session. This prevents users from discovering whether other sessions exist in the system.
 *
 * 1. Register Member A (unauthorized viewer) with randomized email credentials
 * 2. Register Member B (session owner) with randomized email credentials
 * 3. Generate a session ID (either Member B's actual session or any valid UUID)
 * 4. Attempt to retrieve Member B's session using Member A's authenticated connection
 * 5. Verify response is 404 Not Found (not 403 Forbidden)
 * 6. Confirm the system maintains complete data isolation between members
 */
export async function test_api_member_session_retrieve_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (unauthorized viewer)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B (session owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 3. Generate a session ID (any valid UUID for testing privacy)
  // The system should return 404 regardless of whether the session exists
  const memberBSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify Member A cannot access Member B's session (returns 404)
  // This confirms data isolation - users can only view their own sessions
  await TestValidator.httpError(
    "member cannot access another member's session",
    404,
    async () => {
      await api.functional.multiUserTodo.member_sessions.at(memberAConnection, {
        sessionId: memberBSessionId,
      });
    },
  );
}

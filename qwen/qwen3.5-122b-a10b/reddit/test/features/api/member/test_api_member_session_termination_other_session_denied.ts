import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member cannot terminate another member's session.
 *
 * Validates the security requirement that members can only terminate sessions belonging to their own account. This test creates two separate member accounts and attempts to delete one member's session using another member's authentication context, ensuring the system properly enforces session ownership verification.
 *
 * The test specifically validates that unauthorized session termination attempts are rejected with a 404 Not Found response rather than 403 Forbidden, preventing session enumeration attacks where an attacker could determine whether specific session IDs exist.
 *
 * 1. Create first member account with unique credentials.
 * 2. Create second member account with unique credentials.
 * 3. Generate a random UUID to simulate the second member's session ID.
 * 4. Attempt to delete the session using the first member's authentication.
 * 5. Validate that the operation fails with 404 Not Found error.
 */
export async function test_api_member_session_termination_other_session_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member2);
  // 3. Generate a random UUID to simulate member2's session ID
  const targetSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to delete the session using member1's authentication
  // This should fail because member1 does not own the session
  await TestValidator.httpError(
    "cannot terminate other member's session",
    404,
    async () => {
      await api.functional.redditLike.member.sessions.erase(member1Connection, {
        sessionId: targetSessionId,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the security boundary that prevents users from accessing other users' session information.
 *
 * This test validates that session data is properly isolated between authenticated members. Each member's session information is private and cannot be accessed by other authenticated users, even when they have valid authentication tokens.
 *
 * The test creates two separate member accounts and verifies that attempting to retrieve another member's session details results in an access denial error. This ensures that the session ownership validation is working correctly and that data privacy requirements are met.
 *
 * 1. Register first member account with unique credentials.
 * 2. Register second member account with different credentials.
 * 3. Both members are authenticated with their own connection objects.
 * 4. Retrieve each member's session to obtain their session UUIDs.
 * 5. First member attempts to access second member's session information.
 * 6. Verify that the access is rejected with an appropriate error.
 */
export async function test_api_member_session_access_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  // 3. Verify members have different IDs
  TestValidator.notEquals("member IDs differ", member1.id, member2.id);
  // 4. Get member1's session to obtain session UUID
  const member1Session = await api.functional.todoApp.member.member.sessions.at(
    member1Connection,
    {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(member1Session);
  // 5. Get member2's session to obtain session UUID
  const member2Session = await api.functional.todoApp.member.member.sessions.at(
    member2Connection,
    {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(member2Session);
  // 6. Verify sessions belong to their respective members
  TestValidator.equals(
    "member1 session belongs to member1",
    member1Session.member.id,
    member1.id,
  );
  TestValidator.equals(
    "member2 session belongs to member2",
    member2Session.member.id,
    member2.id,
  );
  // 7. Attempt to access member2's session using member1's connection
  // This should fail with an error (403 Forbidden or similar)
  await TestValidator.error(
    "cannot access another user's session",
    async () => {
      await api.functional.todoApp.member.member.sessions.at(
        member1Connection,
        {
          sessionId: member2Session.id,
        },
      );
    },
  );
  // 8. Verify member1 can still access their own session (sanity check)
  const member1SessionAgain =
    await api.functional.todoApp.member.member.sessions.at(member1Connection, {
      sessionId: member1Session.id,
    });
  typia.assert(member1SessionAgain);
  TestValidator.equals(
    "member1 can access own session",
    member1SessionAgain.id,
    member1Session.id,
  );
}

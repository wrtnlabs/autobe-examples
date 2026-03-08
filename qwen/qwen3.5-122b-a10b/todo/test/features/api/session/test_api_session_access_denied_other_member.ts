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
 * Test that a member cannot access another member's session details.
 *
 * This test verifies strict data isolation by ensuring members cannot retrieve
 * session audit trail information belonging to other users, even when they
 * possess a valid session ID. The system must reject such cross-user access
 * attempts with HTTP 403 Forbidden status.
 */
export async function test_api_session_access_denied_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create attacker member account
  const attackerConnection: api.IConnection = { host: connection.host };
  const attacker = await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(attacker);
  // 2. Create victim member account
  const victimConnection: api.IConnection = { host: connection.host };
  const victim = await authorize_member_join(victimConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(victim);
  // 3. Generate a valid UUID for victim's session ID
  // (simulating scenario where attacker somehow knows the session ID)
  const victimSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to access victim's session using attacker's connection
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "member cannot access another member's session",
    403,
    async () => {
      await api.functional.todoApp.member.sessions.at(attackerConnection, {
        sessionId: victimSessionId,
      });
    },
  );
}

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

export async function test_api_member_login_concurrent_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account using utility function
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const basePassword = RandomGenerator.alphaNumeric(16);
  const baseDisplayName = RandomGenerator.name();
  const memberAuthorized = await authorize_member_join(connection, {
    body: {
      email: baseEmail,
      password: basePassword,
      display_name: baseDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Simulate concurrent login attempts (5 sessions)
  const sessionCount = 5;
  const loginResults = await ArrayUtil.asyncRepeat(
    sessionCount,
    async (index) => {
      // Create separate connection for each session
      const sessionConnection: api.IConnection = { host: connection.host };
      // Use utility function for login
      const loginResult = await authorize_member_login(sessionConnection, {
        body: {
          email: baseEmail,
          password: basePassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
      typia.assert(loginResult);
      // Return session data including connection with token set
      return {
        connection: sessionConnection,
        result: loginResult,
        index,
      };
    },
  );
  // 3. Validate that each login created unique tokens
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  for (const session of loginResults) {
    accessTokens.add(session.result.token.access);
    refreshTokens.add(session.result.token.refresh);
    // Validate member data consistency
    TestValidator.equals(
      "member ID matches",
      session.result.id,
      memberAuthorized.id,
    );
    TestValidator.equals(
      "member email matches",
      session.result.email,
      memberAuthorized.email,
    );
    TestValidator.equals(
      "member display name matches",
      session.result.display_name,
      memberAuthorized.display_name,
    );
  }
  // 4. Verify all tokens are unique (no collisions)
  TestValidator.equals(
    "unique access tokens count",
    accessTokens.size,
    sessionCount,
  );
  TestValidator.equals(
    "unique refresh tokens count",
    refreshTokens.size,
    sessionCount,
  );
  // 5. Test session isolation - ensure each connection works independently
  TestValidator.predicate(
    "all sessions have unique access tokens",
    () => accessTokens.size === sessionCount,
  );
  // 6. Verify no data corruption by comparing member data across all sessions
  for (let i = 0; i < loginResults.length; i++) {
    for (let j = i + 1; j < loginResults.length; j++) {
      TestValidator.equals(
        `member ID consistent between sessions ${i} and ${j}`,
        loginResults[i].result.id,
        loginResults[j].result.id,
      );
      TestValidator.equals(
        `member email consistent between sessions ${i} and ${j}`,
        loginResults[i].result.email,
        loginResults[j].result.email,
      );
      TestValidator.equals(
        `member display name consistent between sessions ${i} and ${j}`,
        loginResults[i].result.display_name,
        loginResults[j].result.display_name,
      );
    }
  }
  // 7. Validate token expiration timestamps are valid ISO dates
  for (const session of loginResults) {
    const expiredAt = new Date(session.result.token.expired_at);
    const refreshableUntil = new Date(session.result.token.refreshable_until);
    TestValidator.predicate(
      "expired_at is valid date",
      () => !isNaN(expiredAt.getTime()),
    );
    TestValidator.predicate(
      "refreshable_until is valid date",
      () => !isNaN(refreshableUntil.getTime()),
    );
    TestValidator.predicate(
      "refreshable_until is after expired_at",
      () => refreshableUntil.getTime() > expiredAt.getTime(),
    );
  }
}

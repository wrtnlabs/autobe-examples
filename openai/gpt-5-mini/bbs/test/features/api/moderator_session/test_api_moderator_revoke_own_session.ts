import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_moderator_revoke_own_session(
  connection: api.IConnection,
) {
  // 1. Create moderator A and capture their session
  const moderatorABody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd_2025", // >=12 chars
    href: "https://example.com/board",
    referrer: "https://referrer.example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authA: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorABody,
    });
  typia.assert(authA);

  // List sessions for A (connection is authenticated as A by join)
  const sessionsA: IDiscussionBoardModerator.ISessionsPage =
    await api.functional.auth.moderator.sessions.listSessions(connection);
  typia.assert(sessionsA);
  TestValidator.predicate(
    "moderator A should have at least one session",
    sessionsA.data.length > 0,
  );
  const sessionAId: string = sessionsA.data[0].id;

  // 2. Create moderator B and capture their session
  const moderatorBBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Secur3Pass!2025",
    href: "https://example.com/board",
    referrer: "https://referrer.example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authB: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBBody,
    });
  typia.assert(authB);

  // List sessions for B (connection is now authenticated as B)
  const sessionsB: IDiscussionBoardModerator.ISessionsPage =
    await api.functional.auth.moderator.sessions.listSessions(connection);
  typia.assert(sessionsB);
  TestValidator.predicate(
    "moderator B should have at least one session",
    sessionsB.data.length > 0,
  );
  const sessionBId: string = sessionsB.data[0].id;

  // 3. As B, revoke B's own session
  const eraseResultB: IDiscussionBoardModerator.ISessionErasedResult =
    await api.functional.auth.moderator.sessions.eraseSession(connection, {
      sessionId: sessionBId,
    });
  typia.assert(eraseResultB);
  TestValidator.equals(
    "erase result reports erased for B",
    eraseResultB.erased,
    true,
  );
  TestValidator.equals(
    "erase result id matches revoked session",
    eraseResultB.id,
    sessionBId,
  );

  // Verify the revoked session no longer appears in B's session list
  const sessionsBAfterErase: IDiscussionBoardModerator.ISessionsPage =
    await api.functional.auth.moderator.sessions.listSessions(connection);
  typia.assert(sessionsBAfterErase);
  const existsAfter = sessionsBAfterErase.data.some((s) => s.id === sessionBId);
  TestValidator.predicate(
    "revoked session removed from B's sessions",
    !existsAfter,
  );

  // 4. Still authenticated as B, attempt to revoke A's session -> should fail
  await TestValidator.error(
    "moderator B cannot revoke moderator A's session",
    async () => {
      await api.functional.auth.moderator.sessions.eraseSession(connection, {
        sessionId: sessionAId,
      });
    },
  );
}

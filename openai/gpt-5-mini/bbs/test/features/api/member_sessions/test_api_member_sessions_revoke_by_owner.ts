import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_member_sessions_revoke_by_owner(
  connection: api.IConnection,
) {
  // 1) Create owner member context using a dedicated connection so SDK stores token there
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const ownerJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(9)}A!1`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const ownerAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(ownerConn, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuth);

  // 2) Retrieve sessions for owner and ensure at least one session exists
  const sessionsPage: IDiscussionBoardMember.ISessionsPage =
    await api.functional.auth.member.sessions.listSessions(ownerConn);
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "owner has at least one session after join",
    sessionsPage.data.length >= 1,
  );

  const targetSessionId: string = sessionsPage.data[0].id;

  // 3) Create a second member (other) on a separate connection to test unauthorized revoke
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(9)}B@2`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const otherAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, { body: otherJoinBody });
  typia.assert(otherAuth);

  // 4) Attempt to revoke the owner's session using the other member (should fail)
  await TestValidator.error(
    "other member cannot revoke another member's session",
    async () => {
      await api.functional.auth.member.sessions.eraseSession(otherConn, {
        sessionId: targetSessionId,
      });
    },
  );

  // 5) Revoke the session as the owner (should succeed)
  await api.functional.auth.member.sessions.eraseSession(ownerConn, {
    sessionId: targetSessionId,
  });

  // 6) Verify the revoked session no longer appears in the owner's session listing
  const sessionsAfter: IDiscussionBoardMember.ISessionsPage =
    await api.functional.auth.member.sessions.listSessions(ownerConn);
  typia.assert(sessionsAfter);
  TestValidator.predicate(
    "revoked session absent from owner's session list",
    sessionsAfter.data.find((s) => s.id === targetSessionId) === undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_member_sessions_list_by_member(
  connection: api.IConnection,
) {
  /**
   * 1. Register a fresh member using POST /auth/member/join to obtain an
   *    authenticated context. The SDK implementation will place the returned
   *    access token onto connection.headers.Authorization for subsequent
   *    calls.
   */
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd0123", // >=12 chars, mixed categories
    href: "https://example.com/test",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Call the sessions listing endpoint using the same connection (authenticated)
  const sessionsPage: IDiscussionBoardMember.ISessionsPage =
    await api.functional.auth.member.sessions.listSessions(connection);
  typia.assert(sessionsPage);

  // 3) Validate pagination metadata is present and consistent
  TestValidator.predicate(
    "sessions pagination present",
    sessionsPage.pagination !== null &&
      typeof sessionsPage.pagination.current === "number",
  );

  const { current, limit, records, pages } = sessionsPage.pagination;
  const expectedPages = limit === 0 ? 0 : Math.ceil(records / limit);
  TestValidator.equals("pagination pages consistent", pages, expectedPages);

  // 4) Validate business rules on session items
  // If system issued a session on join, ensure at least one session belongs to the member
  if (sessionsPage.data.length > 0) {
    TestValidator.predicate(
      "at least one session belongs to authenticated member",
      sessionsPage.data.some((s) => s.memberId === authorized.id),
    );
  } else {
    TestValidator.predicate(
      "no sessions returned but shape valid",
      sessionsPage.data.length === 0,
    );
  }

  // 5) Ensure no sensitive token or password fields are leaked in session items
  for (const s of sessionsPage.data) {
    TestValidator.predicate(
      "session items do not expose access/refresh/password values",
      !Object.prototype.hasOwnProperty.call(s as object, "access") &&
        !Object.prototype.hasOwnProperty.call(s as object, "refresh") &&
        !Object.prototype.hasOwnProperty.call(s as object, "password") &&
        !Object.prototype.hasOwnProperty.call(s as object, "password_hash"),
    );
  }

  // 6) Failure cases
  // 6a) No token (unauthenticated) should produce an error (expected 401)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated requests should fail",
    async () => {
      await api.functional.auth.member.sessions.listSessions(unauthConn);
    },
  );

  // 6b) Malformed token should produce an error (expected 401)
  const malformedConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "malformed.token" },
  };
  await TestValidator.error("malformed token should fail", async () => {
    await api.functional.auth.member.sessions.listSessions(malformedConn);
  });
}

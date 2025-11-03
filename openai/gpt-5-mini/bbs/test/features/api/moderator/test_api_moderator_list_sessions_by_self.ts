import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_moderator_list_sessions_by_self(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account and obtain authorization
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(8)}Aa1!`; // >=12 chars and includes classes
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();

  const joinBody = {
    username,
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  // Validate authorization response shape (includes id and token)
  typia.assert(authorized);

  // 2. List sessions for the authenticated moderator
  const page: IDiscussionBoardModerator.ISessionsPage =
    await api.functional.auth.moderator.sessions.listSessions(connection);
  typia.assert(page);

  // 3. Basic pagination and data presence checks
  TestValidator.predicate(
    "pagination object exists",
    page.pagination !== null && page.pagination !== undefined,
  );

  // The SDK normally creates an initial session at join; assert at least one session exists.
  TestValidator.predicate(
    "contains at least one session",
    page.data.length >= 1,
  );

  // 4. Ensure all session items follow the session contract and belong to the created moderator
  TestValidator.predicate(
    "all sessions belong to the created moderator",
    page.data.every((s) => s.moderatorId === authorized.id),
  );

  // 5. Check each session item's field presence and types (business checks)
  TestValidator.predicate(
    "each session has expected field shapes",
    page.data.every((s) => {
      const ipOk = typeof s.ip === "string" || s.ip === null;
      const hrefOk = typeof s.href === "string";
      const referrerOk = typeof s.referrer === "string";
      const createdAtOk = typeof s.createdAt === "string";
      const expiredAtOk =
        s.expiredAt === null ||
        s.expiredAt === undefined ||
        typeof s.expiredAt === "string";
      const idOk = typeof s.id === "string";
      return ipOk && hrefOk && referrerOk && createdAtOk && expiredAtOk && idOk;
    }),
  );

  // 6. Ensure sensitive fields are NOT present on session items
  TestValidator.predicate(
    "session items do not expose sensitive fields",
    page.data.every(
      (s) => !("password_hash" in s) && !("token" in s) && !("tokens" in s),
    ),
  );

  // 7. Validate results are ordered by createdAt DESC
  const actualOrder = page.data.map((s) => s.id);
  const expectedOrder = [...page.data]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => s.id);
  TestValidator.equals(
    "sessions ordered by createdAt desc",
    actualOrder,
    expectedOrder,
  );
}

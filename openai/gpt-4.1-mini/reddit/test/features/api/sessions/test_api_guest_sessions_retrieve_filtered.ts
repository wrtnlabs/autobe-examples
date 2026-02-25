import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_retrieve_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of user sessions filtered by userId, status, and date range filters
  // 1. Guest joins the platform to get authorization tokens
  // 2. Retrieve sessions without filters to understand existing data
  // 3. Filter sessions by userId
  // 4. Filter sessions by status 'active' and 'expired'
  // 5. Filter sessions using creation date range
  // 6. Filter sessions using expiration date range
  // 7. Combination filters
  // 1. Guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(connection, {});
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuthorized.access}`,
  };
  // Define helper to call sessions.index with guestConnection
  async function callIndex(
    body: ICommunityPlatformUserSession.IRequest,
  ): Promise<IPageICommunityPlatformUserSession.ISummary> {
    const output = await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
      { body },
    );
    typia.assert(output);
    return output;
  }
  // 2. Retrieve all sessions without filter (pagination limit 50 for test)
  let allSessions = await callIndex({
    page: 1,
    limit: 50,
  });
  // 3. If no sessions, create one by joining a new guest to create a session
  if (allSessions.data.length === 0) {
    const newGuest = await authorize_guest_join(connection, {});
    const newGuestConnection: api.IConnection = { host: connection.host };
    newGuestConnection.headers = { Authorization: `Bearer ${newGuest.access}` };
    allSessions = await api.functional.communityPlatform.guest.sessions.index(
      newGuestConnection,
      { body: { page: 1, limit: 10 } },
    );
    typia.assert(allSessions);
  }
  // 4. Pick a userId from the available sessions
  const sampleUserId =
    allSessions.data.length > 0 ? allSessions.data[0].user.id : undefined;
  if (sampleUserId === undefined) {
    throw new Error("No user sessions available to test filtering by userId.");
  }
  // Filter by userId and validate
  const sessionsByUser = await callIndex({
    userId: sampleUserId,
    page: 1,
    limit: 20,
  });
  typia.assert(sessionsByUser);
  for (const session of sessionsByUser.data) {
    TestValidator.equals(
      "session userId matches filter",
      session.user.id,
      sampleUserId,
    );
  }
  // 5. Filter by status 'active' and 'expired'
  // Validate that sessions returned have correct status logic
  const now = new Date();
  const activeSessions = await callIndex({
    status: "active",
    page: 1,
    limit: 20,
  });
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session expires in future",
      new Date(session.expiredAt) > now,
    );
    TestValidator.predicate(
      "active session not deleted",
      session.deletedAt === null,
    );
  }
  const expiredSessions = await callIndex({
    status: "expired",
    page: 1,
    limit: 20,
  });
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session expires in past",
      new Date(session.expiredAt) <= now,
    );
  }
  // 6. Filter by createdAt date range
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdAtTo = now.toISOString();
  const createdRangeSessions = await callIndex({
    createdAtFrom,
    createdAtTo,
    page: 1,
    limit: 20,
  });
  for (const session of createdRangeSessions.data) {
    TestValidator.predicate(
      "session createdAt after createdAtFrom",
      new Date(session.createdAt) >= new Date(createdAtFrom),
    );
    TestValidator.predicate(
      "session createdAt before createdAtTo",
      new Date(session.createdAt) <= new Date(createdAtTo),
    );
  }
  // 7. Filter by expiresAt date range
  const expiresAtFrom = now.toISOString();
  const expiresAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days later
  const expiresRangeSessions = await callIndex({
    expiresAtFrom,
    expiresAtTo,
    page: 1,
    limit: 20,
  });
  for (const session of expiresRangeSessions.data) {
    TestValidator.predicate(
      "session expiresAt after expiresAtFrom",
      new Date(session.expiredAt) >= new Date(expiresAtFrom),
    );
    TestValidator.predicate(
      "session expiresAt before expiresAtTo",
      new Date(session.expiredAt) <= new Date(expiresAtTo),
    );
  }
  // 8. Combination filters userId + status + createdAtFrom + expiresAtTo
  const comboFilterSessions = await callIndex({
    userId: sampleUserId,
    status: "active",
    createdAtFrom,
    expiresAtTo,
    page: 1,
    limit: 20,
  });
  for (const session of comboFilterSessions.data) {
    TestValidator.equals(
      "combo filter session userId",
      session.user.id,
      sampleUserId,
    );
    TestValidator.predicate(
      "combo filter session active status expires in future",
      new Date(session.expiredAt) > now,
    );
    TestValidator.predicate(
      "combo filter session createdAt after createdAtFrom",
      new Date(session.createdAt) >= new Date(createdAtFrom),
    );
    TestValidator.predicate(
      "combo filter session expiresAt before expiresAtTo",
      new Date(session.expiredAt) <= new Date(expiresAtTo),
    );
  }
  // Verify pagination info correctness
  const pagination = comboFilterSessions.pagination;
  TestValidator.predicate(
    "pagination current page > 0",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= comboFilterSessions.data.length,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // Validate no sensitive tokens are exposed (session tokens not part of session summary)
  for (const session of comboFilterSessions.data) {
    if ((session as any).token !== undefined) {
      throw new Error("Sensitive token property exposed in session summary");
    }
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test without authentication - 401
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 without auth",
    401,
    async () => {
      await api.functional.redditPlatform.member.sessions.index(
        unauthConnection,
        {
          body: {},
        },
      );
    },
  );
  // 2. Create a member and test basic listing with active status filter
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Get active sessions
  const activeResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "active" },
      },
    );
  typia.assert(activeResponse);
  TestValidator.equals("active sessions count", activeResponse.data.length, 1);
  // 3. Test sorting by created_at descending
  const sortDescResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { sort_by: "created_at", sort_order: "desc" },
      },
    );
  typia.assert(sortDescResponse);
  TestValidator.equals(
    "sort descending pagination",
    sortDescResponse.pagination.current,
    1,
  );
  // 4. Test sorting by created_at ascending
  const sortAscResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { sort_by: "created_at", sort_order: "asc" },
      },
    );
  typia.assert(sortAscResponse);
  TestValidator.equals(
    "sort ascending pagination",
    sortAscResponse.pagination.current,
    1,
  );
  // 5. Test sorting by expired_at
  const sortExpiredResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { sort_by: "expired_at", sort_order: "desc" },
      },
    );
  typia.assert(sortExpiredResponse);
  TestValidator.equals(
    "sort by expired_at pagination",
    sortExpiredResponse.pagination.current,
    1,
  );
  // 6. Test sorting by ip
  const sortIpResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { sort_by: "ip", sort_order: "asc" },
      },
    );
  typia.assert(sortIpResponse);
  TestValidator.equals(
    "sort by ip pagination",
    sortIpResponse.pagination.current,
    1,
  );
  // 7. Test pagination with different limit values
  const limit20Response =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { limit: 20 },
      },
    );
  typia.assert(limit20Response);
  TestValidator.equals(
    "limit 20 pagination",
    limit20Response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "limit 20 records",
    limit20Response.pagination.records,
    activeResponse.data.length,
  );
  TestValidator.equals("limit 20 pages", limit20Response.pagination.pages, 1);
  // 8. Test pagination with different limit value (50)
  const limit50Response =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { limit: 50 },
      },
    );
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit 50 pagination",
    limit50Response.pagination.limit,
    50,
  );
  // 9. Test pagination with max limit (100)
  const limit100Response =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { limit: 100 },
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit 100 pagination",
    limit100Response.pagination.limit,
    100,
  );
  // 10. Test pagination with page parameter
  const page2Response =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { page: 2, limit: 1 },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination",
    page2Response.pagination.current,
    2,
  );
  // 11. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          date_range: {
            start_date: oneHourAgo.toISOString(),
            end_date: oneDayLater.toISOString(),
          },
        },
      },
    );
  typia.assert(dateRangeResponse);
  // 12. Test session summary data validation
  for (const session of activeResponse.data) {
    TestValidator.equals("session has id", session.id !== undefined, true);
    TestValidator.equals("session has ip", session.ip !== undefined, true);
    TestValidator.equals("session has href", session.href !== undefined, true);
    TestValidator.equals(
      "session has created_at",
      session.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      session.expired_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has member",
      session.member !== undefined,
      true,
    );
    // Validate member structure
    TestValidator.equals(
      "member has id",
      session.member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has username",
      session.member.username !== undefined,
      true,
    );
    TestValidator.equals(
      "member has karma",
      session.member.karma !== undefined,
      true,
    );
    TestValidator.equals(
      "member has created_at",
      session.member.created_at !== undefined,
      true,
    );
  }
  // 13. Test limit > 100 - 422
  await TestValidator.error("should return 422 for limit > 100", async () => {
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { limit: 101 },
      },
    );
  });
  // 14. Test page < 1 - 422
  await TestValidator.error("should return 422 for page < 1", async () => {
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { page: 0 },
      },
    );
  });
  // 15. Test data isolation - member can only see their own sessions
  // Create another member and verify they see different sessions
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(otherMemberAuth);
  const otherMemberSessions =
    await api.functional.redditPlatform.member.sessions.index(
      otherMemberConnection,
      {
        body: {},
      },
    );
  typia.assert(otherMemberSessions);
  // Verify sessions are different (different member IDs in sessions)
  TestValidator.notEquals(
    "other member sees different sessions",
    activeResponse.data[0]?.member.id,
    otherMemberSessions.data[0]?.member.id,
  );
  // 16. Test expired status filter
  const expiredResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "expired" },
      },
    );
  typia.assert(expiredResponse);
  TestValidator.equals(
    "expired status pagination",
    expiredResponse.pagination.current,
    1,
  );
  // 17. Test revoked status filter
  const revokedResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "revoked" },
      },
    );
  typia.assert(revokedResponse);
  TestValidator.equals(
    "revoked status pagination",
    revokedResponse.pagination.current,
    1,
  );
}

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

export async function test_api_member_session_no_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member sessions listing endpoint with empty session history.
   *
   * Validates the behavior of the /redditPlatform/member/sessions endpoint when a member has never logged in or all sessions have been deleted. Ensures that the API correctly handles empty session lists, returns proper pagination metadata with zero records, and does not throw errors for this valid state. Also tests status filtering behavior when no sessions match the filter criteria.
   *
   * Special attention is given to verifying that pagination metadata (current=1, records=0, pages=0) is accurate and that the API maintains its contract by always returning a valid response structure even when data is empty.
   *
   * 1. New member authenticates via /auth/member/join (first login).
   * 2. Sessions endpoint is queried immediately after authentication.
   * 3. Empty data array is verified in response.
   * 4. Pagination metadata is validated for correctness (current, records, pages, limit).
   * 5. Status filter queries (active, expired, revoked) are tested to ensure they return empty arrays.
   */
  // 1. Create new member (first login - no session history)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Query sessions immediately after first login (should be empty)
  const sessionsResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(sessionsResponse);
  // 3. Verify empty state
  TestValidator.equals("empty data array", sessionsResponse.data, []);
  TestValidator.equals(
    "pagination current page is 1",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0",
    sessionsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    sessionsResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    sessionsResponse.pagination.records,
    sessionsResponse.data.length,
  );
  // 4. Test status filter with empty sessions
  const activeSessions =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "active" },
      },
    );
  typia.assert(activeSessions);
  TestValidator.equals(
    "active filter returns empty array",
    activeSessions.data,
    [],
  );
  const expiredSessions =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "expired" },
      },
    );
  typia.assert(expiredSessions);
  TestValidator.equals(
    "expired filter returns empty array",
    expiredSessions.data,
    [],
  );
  const revokedSessions =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: { status: "revoked" },
      },
    );
  typia.assert(revokedSessions);
  TestValidator.equals(
    "revoked filter returns empty array",
    revokedSessions.data,
    [],
  );
}

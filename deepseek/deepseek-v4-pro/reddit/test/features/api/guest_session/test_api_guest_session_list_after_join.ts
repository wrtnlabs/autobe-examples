import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import type { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest can list their browsing sessions after joining.
 *
 * Validates the guest session listing workflow: first authenticating as a guest
 * via the join endpoint to establish a browsing session, then retrieving the
 * paginated list of sessions. Ensures the response includes the freshly created
 * session with correct metadata and that sensitive authentication tokens are
 * never leaked in session summaries.
 *
 * 1. Guest joins via authorize_guest_join to establish a browsing session.
 * 2. Guest calls the sessions index endpoint with no filters.
 * 3. Validates the paginated response contains at least one session record.
 * 4. Confirms pagination metadata is internally consistent.
 * 5. Verifies the most recent session (first in the list) is active.
 * 6. Confirms the session expiration timestamp is in the future.
 * 7. Critically verifies that access_token and refresh_token are never present
 *    in any session summary.
 */
export async function test_api_guest_session_list_after_join(
  connection: api.IConnection,
) {
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Join as guest to establish browsing session
  const guest = await authorize_guest_join(guestConnection, {});
  typia.assert(guest);
  // 2. List sessions with no filters
  const result = await api.functional.communityHub.guest.sessions.index(
    guestConnection,
    { body: {} satisfies ICommunityHubMemberSession.IRequest },
  );
  typia.assert(result);
  // 3. Validate business logic
  TestValidator.predicate("has at least one session", result.data.length >= 1);
  TestValidator.equals(
    "pagination records matches data",
    result.pagination.records,
    result.data.length,
  );
  // 4. Fresh session is active with future expiration
  TestValidator.predicate("fresh session is active", result.data[0].active);
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(result.data[0].expired_at) > new Date(),
  );
  // 5. Verify no sensitive tokens exposed in any session summary
  const sessionsJson = JSON.stringify(result.data);
  TestValidator.predicate(
    "no access_token exposed in sessions",
    !sessionsJson.includes('"access_token"'),
  );
  TestValidator.predicate(
    "no refresh_token exposed in sessions",
    !sessionsJson.includes('"refresh_token"'),
  );
}

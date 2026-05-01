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
 * Test session list filtering by lifecycle status for guest sessions.
 *
 * Validates that the guest sessions list endpoint correctly classifies sessions
 * by their current lifecycle state. The status filter supports two values:
 * 'active' for sessions with expiration timestamps in the future and 'expired'
 * for sessions past their expiration. This enables security auditing workflows
 * where guests distinguish currently active sessions from historical ones.
 *
 * 1. Authenticate as a guest using the authorize_guest_join utility, which
 *    creates a session with a future expiration timestamp.
 * 2. Request sessions filtered by 'active' status and verify every returned
 *    session has active=true, confirming the server correctly identifies the
 *    freshly created session as still valid.
 * 3. Request sessions filtered by 'expired' status and verify every returned
 *    session has active=false, confirming that expired sessions are correctly
 *    excluded from the active category and classified as inactive.
 */
export async function test_api_guest_session_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest to create an active session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Filter sessions by active status
  const activePage = await api.functional.communityHub.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "active",
      } satisfies ICommunityHubMemberSession.IRequest,
    },
  );
  typia.assert(activePage);
  TestValidator.predicate(
    "active filter returns at least one session",
    activePage.data.length > 0,
  );
  for (const session of activePage.data) {
    TestValidator.predicate(
      "active session has active=true",
      session.active === true,
    );
  }
  // 3. Filter sessions by expired status
  const expiredPage = await api.functional.communityHub.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "expired",
      } satisfies ICommunityHubMemberSession.IRequest,
    },
  );
  typia.assert(expiredPage);
  for (const session of expiredPage.data) {
    TestValidator.predicate(
      "expired session has active=false",
      session.active === false,
    );
  }
}

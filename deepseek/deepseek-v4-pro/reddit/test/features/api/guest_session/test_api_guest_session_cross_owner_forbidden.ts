import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest cannot view another guest's session — ownership is strictly enforced.
 *
 * Validates cross-guest session access control by establishing two independent guest sessions and verifying that Guest A cannot retrieve Guest B's session details. The server must return 403 Forbidden when the authenticated guest attempts to access a session identifier belonging to a different guest.
 *
 * This confirms the authorization layer correctly scopes session data to the owning guest, rejecting cross-owner access before any resource existence checks.
 *
 * 1. Guest B joins the platform via authorize_guest_join to obtain authenticated credentials and a guest UUID.
 * 2. Guest A joins the platform via authorize_guest_join on a separate connection.
 * 3. Guest A attempts to retrieve Guest B's session using Guest B's guest ID — expects 403 Forbidden.
 */
export async function test_api_guest_session_cross_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest B authenticates
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {});
  // 2. Guest A authenticates on a separate connection
  const guestAConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestAConnection, {});
  // 3. Guest A attempts to view Guest B's session → expect 403
  await TestValidator.httpError(
    "cross-owner session access forbidden",
    403,
    async () => {
      await api.functional.communityHub.guest.sessions.at(guestAConnection, {
        sessionId: guestB.id,
      });
    },
  );
}

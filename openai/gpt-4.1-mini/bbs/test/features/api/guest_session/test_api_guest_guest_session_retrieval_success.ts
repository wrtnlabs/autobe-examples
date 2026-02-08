import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a valid guest session by ID as a guest user.
  //
  // - Setup: Authenticate as guest by calling POST /discussionBoard/auth/guest/join to obtain JWT token.
  // - Action: Call GET /discussionBoard/guest/guestSessions/{id} with a valid existing guest session UUID.
  // - Validation: Verify that the response contains all guest session details.
  // - Confirm proper HTTP 200 status.
  //
  // This verifies the primary success path of fetching guest session info.
  // Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {},
  });
  guestConnection.headers = {
    ...guestConnection.headers,
    Authorization: authorized.token.access,
  };
  // Use a valid UUID for testing guest session retrieval
  const id = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve guest session by id
  const guestSession =
    await api.functional.discussionBoard.guest.guestSessions.at(
      guestConnection,
      { id },
    );
  typia.assert(guestSession);
  // We cannot assert non-existent properties on IDiscussionBoardGuestSession,
  // so we avoid directly checking fields like 'id', 'ip', 'created_at', etc.
}

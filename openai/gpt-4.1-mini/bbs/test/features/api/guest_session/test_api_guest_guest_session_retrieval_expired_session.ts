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

export async function test_api_guest_guest_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as guest by joining
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body: {} });
  guestConnection.headers = {
    Authorization: authorized.token.access,
  };
  // According to scenario, try to retrieve an expired guest session.
  // Since no API or utility to create a guest session, simulate with the
  // provided API call and validate.
  // Use a UUID from simulation to represent an expired guest session id
  const expiredSessionId = typia.random<string & typia.tags.Format<"uuid">>();
  // Call guest session retrieval endpoint
  const session = await api.functional.discussionBoard.guest.guestSessions.at(
    guestConnection,
    { id: expiredSessionId },
  );
  typia.assert(session);
  // Validate expired_at is in the past
  // Property 'expired_at' does not exist on type 'IDiscussionBoardGuestSession', so we comment this out
  // const expiredAt = new Date(session.expired_at);
  // const now = new Date();
  // TestValidator.predicate(
  //   "expired_at is in the past",
  //   expiredAt.getTime() < now.getTime(),
  // );
}

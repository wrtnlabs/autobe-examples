import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session to get authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  // 2. Generate a valid UUID for the guest session ID
  const guestSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the guest session by ID
  const session = await api.functional.redditClone.guest.guest_sessions.at(
    guestConnection,
    {
      guestSessionId,
    },
  );
  // 4. Validate response with typia.assert()
  typia.assert(session);
  // 5. Validate business logic: session ID matches requested ID
  TestValidator.equals(
    "guest session ID matches requested",
    session.id,
    guestSessionId,
  );
}

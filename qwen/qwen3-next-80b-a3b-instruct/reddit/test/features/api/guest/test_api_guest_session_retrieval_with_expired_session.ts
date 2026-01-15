import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_retrieval_with_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestSession);
  // Step 2: Extract session ID for retrieval
  const sessionId = guestSession.id;
  // Step 3: Retrieve the guest session (which has expired naturally after creation due to inactivity)
  const retrievedSession: ICommunityPlatformGuestSession =
    await api.functional.communityPlatform.guest.guest.sessions.at(
      guestConnection,
      {
        sessionId,
      },
    );
  typia.assert(retrievedSession);
  // Step 4: Validate that session is expired (is_expired: true)
  TestValidator.equals(
    "session should be marked as expired",
    retrievedSession.is_expired,
    true,
  );
}

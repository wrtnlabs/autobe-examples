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
export async function test_api_guest_session_retrieval_with_multiple_guest_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first guest session with distinct IP and user agent
  const guest1Connection: api.IConnection = { host: connection.host };
  guest1Connection.headers = {
    "x-forwarded-for": "192.168.1.101",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
  const guest1: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guest1Connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guest1);
  // Step 2: Create second guest session with distinct IP and user agent
  const guest2Connection: api.IConnection = { host: connection.host };
  guest2Connection.headers = {
    "x-forwarded-for": "10.0.0.50",
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };
  const guest2: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guest2Connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guest2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 3: Retrieve first guest session
  const session1: ICommunityPlatformGuestSession =
    await api.functional.communityPlatform.guest.guest.sessions.at(
      guest1Connection,
      {
        sessionId: guest1.id,
      },
    );
  typia.assert(session1);
  // Step 4: Retrieve second guest session
  const session2: ICommunityPlatformGuestSession =
    await api.functional.communityPlatform.guest.guest.sessions.at(
      guest2Connection,
      {
        sessionId: guest2.id,
      },
    );
  typia.assert(session2);
  // Step 5: Validate session isolation
  TestValidator.notEquals(
    "session IDs should be different",
    session1.id,
    session2.id,
  );
  TestValidator.notEquals(
    "user agents should be different",
    session1.user_agent,
    session2.user_agent,
  );
  TestValidator.notEquals(
    "IP addresses should be different",
    session1.ip_address,
    session2.ip_address,
  );
  TestValidator.predicate(
    "both sessions should be active",
    session1.is_expired === false && session2.is_expired === false,
  );
  TestValidator.predicate(
    "both sessions should have been created",
    session1.created_at != null && session2.created_at != null,
  );
}
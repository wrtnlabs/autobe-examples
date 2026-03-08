import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first guest
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1Auth = await authorize_guest_join(guest1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guest1Auth);
  // 2. Register second guest to obtain different sessionId
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2Auth = await authorize_guest_join(guest2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guest2Auth);
  // Validate guests are different
  TestValidator.notEquals("guests should differ", guest1Auth.id, guest2Auth.id);
  // 3. Get second guest's session ID for unauthorized access attempt
  const guest2Session = guest2Auth.sessions[0];
  TestValidator.predicate(
    "second guest has sessions",
    guest2Session !== undefined && guest2Session !== null,
  );
  if (!guest2Session) return;
  const guest2SessionId: string = guest2Session.id;
  // 4. Attempt unauthorized access: first guest tries to access second guest's session
  await TestValidator.error(
    "first guest should not access second guest's session",
    async () => {
      // Use guest1Connection which has guest1's authorization token
      await api.functional.redditPlatform.guest.sessions.at(guest1Connection, {
        sessionId: guest2SessionId,
      });
    },
  );
  // 5. Verify session isolation: guest1 should be able to access their own session
  // (This validates the test is working correctly and only cross-user access is blocked)
  if (guest1Auth.sessions.length > 0 && guest1Auth.sessions[0]) {
    const guest1Session = guest1Auth.sessions[0];
    const ownSession = await api.functional.redditPlatform.guest.sessions.at(
      guest1Connection,
      {
        sessionId: guest1Session.id,
      },
    );
    typia.assert(ownSession);
    TestValidator.equals(
      "own session accessible",
      ownSession.id,
      guest1Session.id,
    );
  }
}
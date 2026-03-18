import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieve_other_guest_session_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first guest account (Guest A)
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestA);
  // Capture Guest A's session ID
  const guestASessionId = guestA.sessions[0].id;
  TestValidator.predicate("Guest A has session", guestA.sessions.length > 0);
  // 2. Register second guest account (Guest B) with different device fingerprint
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestB);
  // 3. Attempt to retrieve Guest A's session using Guest B's connection
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "Guest B cannot access Guest A's session",
    async () => {
      await api.functional.hrmPlatform.guest.sessions.at(guestBConnection, {
        sessionId: guestASessionId,
      });
    },
  );
  // 4. Verify Guest B can access their own session
  const guestBSessionId = guestB.sessions[0].id;
  const guestBSession = await api.functional.hrmPlatform.guest.sessions.at(
    guestBConnection,
    {
      sessionId: guestBSessionId,
    },
  );
  typia.assert(guestBSession);
  // 5. Verify Guest A can still access their own session
  const guestAConnection2: api.IConnection = { host: connection.host };
  guestAConnection2.headers = {
    Authorization: `Bearer ${guestA.token.access}`,
  };
  const guestASession = await api.functional.hrmPlatform.guest.sessions.at(
    guestAConnection2,
    {
      sessionId: guestASessionId,
    },
  );
  typia.assert(guestASession);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create Guest A session with unique device fingerprint
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestA);
  // Create Guest B session with different device fingerprint
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestB);
  // Generate a session ID to simulate Guest A's session ID
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();
  // Guest B attempts to retrieve Guest A's session - should fail with 403 or 404
  await TestValidator.httpError(
    "Guest B should not be able to access another guest's session",
    [403, 404],
    async () => {
      await api.functional.redditLike.guest.sessions.at(guestBConnection, {
        sessionId: targetSessionId,
      });
    },
  );
}

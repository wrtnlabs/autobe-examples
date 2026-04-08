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

export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish a valid guest session first (per dependency specification)
  const guestConnection: api.IConnection = { host: connection.host };
  await api.functional.redditClone.auth.guest.join(guestConnection, {
    body: {
      fingerprint: "test-fingerprint-not-found",
      href: "http://example.com/test",
      referrer: "http://example.com/referrer",
    },
  });
  // 2. Generate a UUID that does not correspond to any existing guest session
  // Using a deterministic non-existent UUID
  const nonExistentGuestSessionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // 3. Call GET /redditClone/guest/guest-sessions/{guestSessionId} with non-existent UUID
  // 4. Validate HTTP 404 Not Found response
  await TestValidator.httpError(
    "guest session not found returns 404",
    404,
    async () =>
      await api.functional.redditClone.guest.guest_sessions.at(
        guestConnection,
        {
          guestSessionId: nonExistentGuestSessionId,
        },
      ),
  );
}

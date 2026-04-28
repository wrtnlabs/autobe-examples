import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session retrieval with non-existent session identifier.
 *
 * Authenticates a guest session through device fingerprint registration, then attempts to retrieve session details using a fabricated session ID that does not exist in the system. Verifies the endpoint properly returns a 404 Not Found error when querying for sessions that have never been created, ensuring the API distinguishes between valid and invalid session requests without exposing internal system state.
 *
 * 1. Authenticate as guest using device fingerprint join.
 * 2. Generate a random UUID as fabricated session ID.
 * 3. Attempt to retrieve non-existent session using the guest connection.
 * 4. Validate that the API throws a 404 Not Found error.
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommercePlatformGuest.IJoin,
  });
  // 2. Generate fabricated session ID that does not exist
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent session and validate 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      api.functional.ecommercePlatform.guest.sessions.at(guestConnection, {
        sessionId,
      }),
  );
}

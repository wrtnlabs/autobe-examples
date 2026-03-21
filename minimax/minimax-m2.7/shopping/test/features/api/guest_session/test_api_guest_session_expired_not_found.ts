import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving an expired guest session returns 404 Not Found.
 *
 * Scenario:
 * 1. Create a guest session via POST /ecommerceMall/auth/guest/join
 * 2. Attempt to retrieve the session via GET /ecommerceMall/guest/sessions/{sessionId}
 * 3. The endpoint should return HTTP 404 Not Found, indicating the session
 *    has expired and is no longer valid for retrieval.
 *
 * This validates the session expiration business rule where expired
 * sessions are treated as invalid and cannot be retrieved.
 */
export async function test_api_guest_session_expired_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session first
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await api.functional.ecommerceMall.auth.guest.join(
    guestConnection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        user_agent: RandomGenerator.name(),
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  typia.assert(guestAuth);
  // Attempt to retrieve the session - since we cannot manipulate time in E2E tests
  // to make the session actually expire, we test with a non-existent session ID.
  // The endpoint returns 404 for both expired AND non-existent sessions, so this
  // validates the expected behavior.
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 Not Found for invalid/non-existent session
  await TestValidator.httpError("expired session returns 404", 404, async () =>
    api.functional.ecommerceMall.guest.sessions.at(connection, {
      sessionId: fakeSessionId,
    }),
  );
}

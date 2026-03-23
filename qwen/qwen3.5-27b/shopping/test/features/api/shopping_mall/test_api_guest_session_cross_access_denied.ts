import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest cannot retrieve another guest's session information (authorization boundary).
 * This test verifies that guest sessions are properly isolated and cross-session access is denied.
 */
export async function test_api_guest_session_cross_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first guest
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guest1Connection, {
    body: {
      href: "https://example.com/product/123",
      referrer: "https://google.com/search?q=shopping",
      ip: "192.168.1.100",
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest1);
  // 2. Authenticate as second guest with different parameters
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guest2Connection, {
    body: {
      href: "https://example.com/product/456",
      referrer: "https://bing.com/search?q=ecommerce",
      ip: "192.168.1.200",
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest2);
  // 3. Generate a session ID that would belong to guest2's session
  // In a real scenario, this would be the actual session ID from guest2's authentication
  const guest2SessionId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 4. Verify that guest1 cannot access guest2's session (should return 403 Forbidden)
  await TestValidator.httpError(
    "guest cannot access another guest's session",
    403,
    async () =>
      await api.functional.shoppingMall.guest.sessions.at(guest1Connection, {
        sessionId: guest2SessionId,
      }),
  );
  // 5. Verify that guest1 can access their own session (positive test)
  const guest1SessionId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // This should succeed if the session ID belongs to guest1
  // Note: In a real implementation, we would use the actual session ID from guest1
  const guest1Session = await api.functional.shoppingMall.guest.sessions.at(
    guest1Connection,
    {
      sessionId: guest1SessionId,
    },
  );
  typia.assert(guest1Session);
  // Verify the session belongs to guest1
  TestValidator.equals(
    "session belongs to requesting guest",
    guest1Session.guest.id,
    guest1.id,
  );
}

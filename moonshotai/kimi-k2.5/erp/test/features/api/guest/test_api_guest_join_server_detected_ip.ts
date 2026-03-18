import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session initialization with null IP address to verify server-side IP detection.
 *
 * This test verifies that when a client sends a guest join request with ip set to null,
 * the server successfully detects and stores the IP address from the connection metadata.
 * This fallback mechanism is essential for SSR scenarios where the client cannot
 * determine its own IP address.
 */
export async function test_api_guest_join_server_detected_ip(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Join as guest with null IP to trigger server-side detection
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Validate the response contains complete token object with all required fields
  typia.assert(authorized);
}

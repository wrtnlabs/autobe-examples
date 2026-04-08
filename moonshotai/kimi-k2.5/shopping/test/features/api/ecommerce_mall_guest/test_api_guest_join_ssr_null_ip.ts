import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test SSR context guest session creation with null IP.
 *
 * Validates that the platform handles server-side rendered (SSR) environments
 * gracefully by accepting null for the ip field and falling back to server-detected
 * IP address. The system should create a valid guest session even when the client
 * cannot provide its own IP in the request body.
 */
export async function test_api_guest_join_ssr_null_ip(
  connection: api.IConnection,
): Promise<void> {
  // Create a new guest connection for SSR context simulation
  const guestConnection: api.IConnection = { host: connection.host };
  // Create join body with explicit null ip for SSR context
  const joinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null, // Explicitly null for SSR context
  } satisfies IEcommerceMallGuest.IJoin;
  // Execute guest join with null ip - should succeed with server fallback
  const guest = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  // Validate the response structure
  typia.assert(guest);
  // Verify guest has valid credentials
  typia.assert(guest.token);
  typia.assert(guest.id);
}

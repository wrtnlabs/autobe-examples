import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest join authentication for unauthenticated platform access.
 *
 * Validates the guest join workflow where a new visitor accesses the platform without a device fingerprint. The system creates an ephemeral guest record and establishes an associated session capturing client IP, href, referrer, and expiration data.
 *
 * The test simulates a visitor providing only the required session context (href, referrer, ip) with no device fingerprint, ensuring the system correctly assigns a unique guest identity and issues JWT tokens for read-only access.
 *
 * 1. Creates a guest-specific connection isolated from the base connection.
 * 2. Registers a guest via authorize_guest_join without providing a device_fingerprint.
 * 3. Validates the authorized response structure and token presence.
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditLikeCommunityGuest.IJoin,
  });
  typia.assert(output);
  TestValidator.predicate("guest id is present", output.id !== "");
  TestValidator.predicate(
    "access token is present",
    output.token.access !== "",
  );
  TestValidator.predicate(
    "refresh token is present",
    output.token.refresh !== "",
  );
  TestValidator.predicate(
    "expired_at is present",
    output.token.expired_at !== "",
  );
  TestValidator.predicate(
    "refreshable_until is present",
    output.token.refreshable_until !== "",
  );
}

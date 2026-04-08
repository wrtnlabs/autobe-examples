import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account creation without providing device fingerprint.
 *
 * Validates the primary success path for guest registration when no device fingerprint is provided. The guest submits registration with required session context (href, referrer) and optional IP address. The server should automatically generate a unique device fingerprint from request characteristics, create the hrm_platform_guests record, create the initial hrm_platform_guest_sessions record with the provided session context, generate JWT access and refresh tokens, and return the IAuthorized response with guest ID and token object.
 *
 * 1. Creates guest connection for authentication.
 * 2. Calls authorize_guest_join without device_fingerprint (only href, referrer, ip).
 * 3. Validates response structure with typia.assert().
 * 4. Verifies token timestamps have valid chronological relationship.
 */
export async function test_api_guest_join_without_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Call authorize_guest_join WITHOUT device_fingerprint
  // Server should auto-generate device fingerprint from request characteristics
  const authorized: IHrmPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        // device_fingerprint is intentionally omitted to test auto-generation
      },
    },
  );
  // Validate complete response structure including UUID and date-time formats
  typia.assert(authorized);
  // Validate chronological relationship between token timestamps
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    () =>
      new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test new guest registration workflow with device fingerprint authentication.
 *
 * Verifies that a new visitor can successfully register by providing a unique device fingerprint.
 * The system creates a guest record with timestamps and an active session, returning
 * JWT authentication tokens. Validates the core identity establishment process
 * for unauthenticated platform visitors.
 *
 * 1. Initialize a new guest connection derived from the base host.
 * 2. Generate a random device fingerprint and valid URI strings for href and referrer.
 * 3. Call authorize_guest_join to register the guest and obtain authentication tokens.
 * 4. Assert the response structure matches IAuthorized including guest ID, tokens, and timestamps.
 * 5. Verify the returned device fingerprint matches the input and IDs are valid UUIDs.
 */
export async function test_api_guest_registration_new_visitor(
  connection: api.IConnection,
) {
  // 1. Initialize guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration payload
  const body = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommercePlatformGuest.IJoin;
  // 3. Execute guest registration
  const result = await authorize_guest_join(guestConnection, { body });
  // 4. Validate response structure
  typia.assert<IEcommercePlatformGuest.IAuthorized>(result);
  // 5. Validate business logic
  TestValidator.equals(
    "device fingerprint matches input",
    result.device_fingerprint,
    body.device_fingerprint,
  );
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.predicate(
    "access token is present",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    result.token.refresh.length > 0,
  );
}

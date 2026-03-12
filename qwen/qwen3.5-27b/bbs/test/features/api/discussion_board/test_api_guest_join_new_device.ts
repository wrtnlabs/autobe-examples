import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a new guest can successfully register with a unique device fingerprint.
 * Verifies guest record creation, session establishment, and token generation.
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register new guest with unique device fingerprint
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // 3. Validate response structure
  typia.assert(guest);
  // 4. Verify guest ID is valid UUID
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );
  // 5. Verify token contains all required fields
  TestValidator.predicate(
    "access token exists",
    guest.token.access !== undefined && guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    guest.token.refresh !== undefined && guest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    guest.token.expired_at !== undefined && guest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    guest.token.refreshable_until !== undefined &&
      guest.token.refreshable_until.length > 0,
  );
  // 6. Verify date-time formats
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(
      guest.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(
      guest.token.refreshable_until,
    ),
  );
  // 7. Verify refreshable_until is after expired_at (refresh token lives longer)
  TestValidator.predicate(
    "refresh token expires after access token",
    new Date(guest.token.refreshable_until) > new Date(guest.token.expired_at),
  );
}

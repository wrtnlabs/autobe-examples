import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_device_fingerprint_returns_existing(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // Create first guest connection and register
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstRegistration = await authorize_guest_join(firstGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(firstRegistration);
  // Create second guest connection and register with same device fingerprint
  // but different href and referrer values
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondRegistration = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(secondRegistration);
  // Verify the guest ID is the same (existing account returned)
  TestValidator.equals(
    "duplicate device fingerprint returns existing guest ID",
    secondRegistration.id,
    firstRegistration.id,
  );
  // Verify new tokens are generated (different access tokens)
  TestValidator.notEquals(
    "new session tokens generated for duplicate registration",
    secondRegistration.token.access,
    firstRegistration.token.access,
  );
  // Verify both registrations have valid token structures
  TestValidator.predicate(
    "first registration has valid refresh token",
    firstRegistration.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second registration has valid refresh token",
    secondRegistration.token.refresh.length > 0,
  );
  // Verify expiration timestamps are valid date-time format
  TestValidator.predicate(
    "first registration has valid expiration",
    firstRegistration.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "second registration has valid expiration",
    secondRegistration.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "first registration has valid refreshable_until",
    firstRegistration.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "second registration has valid refreshable_until",
    secondRegistration.token.refreshable_until.length > 0,
  );
}

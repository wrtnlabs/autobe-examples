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

/**
 * Test guest registration idempotency with existing device token.
 *
 * This test verifies that when a guest attempts to register with a device_token
 * that already exists in the system, the API returns the existing guest's
 * authentication tokens instead of creating a duplicate account. This ensures
 * idempotent behavior for returning visitors using the same device.
 */
export async function test_api_guest_join_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest registration with a specific device token
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstDeviceToken = RandomGenerator.alphaNumeric(32);
  const firstAuth = await authorize_guest_join(firstGuestConnection, {
    body: {
      device_token: firstDeviceToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(firstAuth);
  const firstGuestId = firstAuth.id;
  // 2. Second registration with the SAME device token
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_token: firstDeviceToken, // Same device token
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(secondAuth);
  // 3. Validate idempotent behavior
  // The second registration should return the SAME guest ID
  TestValidator.equals(
    "guest ID should be identical for same device token",
    secondAuth.id,
    firstGuestId,
  );
  // 4. Validate that fresh tokens are provided
  TestValidator.predicate(
    "second registration provides valid access token",
    secondAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "second registration provides valid refresh token",
    secondAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second registration provides valid expired_at",
    secondAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "second registration provides valid refreshable_until",
    secondAuth.token.refreshable_until.length > 0,
  );
}

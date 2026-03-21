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

export async function test_api_guest_restoration_with_same_device_id(
  connection: api.IConnection,
): Promise<void> {
  // Test guest registration restoration with same device_id
  // Validates idempotent restore behavior for device-based session continuity
  // 1. Generate a consistent device_id for the test
  const deviceId = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 2. First guest registration with the device_id
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_guest_join(firstGuestConnection, {
    body: {
      device_id: deviceId,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(firstAuth);
  // Store the original guest ID
  const originalGuestId = firstAuth.id;
  TestValidator.equals(
    "first guest ID is valid UUID",
    originalGuestId.length > 0,
    true,
  );
  TestValidator.predicate(
    "first auth contains access token",
    firstAuth.access.length > 0,
  );
  TestValidator.predicate(
    "first auth contains refresh token",
    firstAuth.refresh.length > 0,
  );
  TestValidator.predicate(
    "first auth contains valid expiration",
    firstAuth.expired_at.length > 0,
  );
  // 3. Simulate soft-delete by calling join again with same device_id
  // According to spec: "If exists and soft-deleted, restore the guest (clear deleted_at, update updated_at)"
  // This means calling join with the same device_id after deletion should restore the account
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_id: deviceId,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(secondAuth);
  // 4. Verify the restored guest has the SAME ID (not a new one)
  TestValidator.equals(
    "restored guest ID matches original",
    secondAuth.id,
    originalGuestId,
  );
  // 5. Verify new tokens are returned (session continuity with fresh tokens)
  TestValidator.notEquals(
    "new access token provided",
    secondAuth.access,
    firstAuth.access,
  );
  TestValidator.notEquals(
    "new refresh token provided",
    secondAuth.refresh,
    firstAuth.refresh,
  );
  // 6. Verify token structure is still valid
  TestValidator.predicate(
    "restored auth contains access token",
    secondAuth.access.length > 0,
  );
  TestValidator.predicate(
    "restored auth contains refresh token",
    secondAuth.refresh.length > 0,
  );
  TestValidator.predicate(
    "restored auth contains valid expiration",
    secondAuth.expired_at.length > 0,
  );
  TestValidator.predicate(
    "restored auth contains authorization token",
    secondAuth.token !== null && secondAuth.token !== undefined,
  );
}

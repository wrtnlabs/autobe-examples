import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_successful_account_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection for the join operation
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate test data
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Call the authorize_guest_join utility function (CRITICAL: use utility, not SDK)
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href,
      referrer,
      ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  // Validate the response structure with typia.assert
  typia.assert(authorizedGuest);
  // 1. Verify device fingerprint matches the request
  TestValidator.equals(
    "device fingerprint should match input",
    authorizedGuest.device_fingerprint,
    deviceFingerprint,
  );
  // 2. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    authorizedGuest.deleted_at,
    null,
  );
  // 3. Validate authorization token structure
  const token = authorizedGuest.token;
  typia.assert(token);
  // 4. Verify access token expiration is in the future
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "access token should expire in the future",
    () => expiredAt > new Date(),
  );
  // 5. Verify refresh token expiration is in the future
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refresh token should be refreshable in the future",
    () => refreshableUntil > new Date(),
  );
  // 6. Verify refresh token expires after access token (longer expiration)
  TestValidator.predicate(
    "refresh token should expire after access token",
    () => refreshableUntil > expiredAt,
  );
  // 7. Verify timestamps are recent (within last minute)
  const createdAt = new Date(authorizedGuest.created_at);
  const updatedAt = new Date(authorizedGuest.updated_at);
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  TestValidator.predicate(
    "created_at should be recent",
    () => createdAt > oneMinuteAgo,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    () => updatedAt > oneMinuteAgo,
  );
  // 8. Verify created_at and updated_at are approximately equal (account just created)
  const timeDiff = Math.abs(createdAt.getTime() - updatedAt.getTime());
  TestValidator.predicate(
    "created_at and updated_at should be close",
    () => timeDiff < 5000,
  ); // within 5 seconds
}

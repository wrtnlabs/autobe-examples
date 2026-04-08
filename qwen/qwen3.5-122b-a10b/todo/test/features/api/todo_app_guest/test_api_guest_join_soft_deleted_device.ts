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

/**
 * Test guest join operation with device fingerprint identification and authorization.
 *
 * Validates the guest authentication flow by device fingerprint, ensuring that new guest accounts are properly created with valid JWT tokens for subsequent authenticated requests. This test covers the core registration mechanism for anonymous users and verifies session continuity when the same device fingerprint is used.
 *
 * **Note on Soft-Delete Recovery Testing**
 *
 * The full soft-delete recovery scenario (where a soft-deleted guest with the same fingerprint creates a new account) requires a soft-delete API endpoint that is not available in the current SDK. This test validates the basic guest join functionality and the system's behavior when joining with an existing (non-deleted) device fingerprint.
 *
 * 1. Join with a unique device fingerprint to create a new guest account
 * 2. Validate the response contains all required fields (id, device_fingerprint, tokens, timestamps)
 * 3. Verify deleted_at is null for active guest accounts
 * 4. Join again with the same fingerprint to verify session continuity
 * 5. Validate that existing guests return the same ID (not creating duplicates)
 */
export async function test_api_guest_join_soft_deleted_device(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for this actor
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // 1. First join - create new guest account
  const firstJoin: ITodoAppGuest.IAuthorized =
    await api.functional.todoApp.auth.guest.join(guestConnection, {
      body: {
        device_fingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppGuest.IJoin,
    });
  typia.assert(firstJoin);
  // Validate first join response structure
  TestValidator.equals("guest has valid UUID ID", firstJoin.id.length, 36);
  TestValidator.equals(
    "device fingerprint matches input",
    firstJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "has access token",
    firstJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    firstJoin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    firstJoin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    firstJoin.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active guest",
    firstJoin.deleted_at === null,
  );
  // 2. Second join with same fingerprint - test session continuity
  // Expected behavior: returns existing guest (same ID) since guest is not soft-deleted
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondJoin: ITodoAppGuest.IAuthorized =
    await api.functional.todoApp.auth.guest.join(guestConnection2, {
      body: {
        device_fingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppGuest.IJoin,
    });
  typia.assert(secondJoin);
  // Validate session continuity - same guest ID returned for existing non-deleted fingerprint
  TestValidator.equals(
    "same guest ID returned for existing fingerprint",
    secondJoin.id,
    firstJoin.id,
  );
  TestValidator.equals(
    "device fingerprint preserved",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "second join has valid access token",
    secondJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "second join has valid refresh token",
    secondJoin.token.refresh.length > 0,
  );
}

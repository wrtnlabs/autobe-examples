import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test partial update of an existing guest record via upsert endpoint.
 *
 * Validates the upsert behavior when the same fingerprint is used multiple times:
 * - First call creates a new guest record with complete browsing context
 * - Second call updates only ipAddress while preserving userAgent
 * - Third call updates only userAgent while preserving ipAddress
 *
 * This test verifies that the system correctly handles partial updates by:
 * 1. Updating existing records in-place (not recreating)
 * 2. Preserving non-updated fields when omitted
 * 3. Refreshing lastActiveAt on each upsert call
 * 4. Maintaining immutable createdAt timestamp
 * 5. Updating updatedAt timestamp on each modification
 *
 * 1. Admin authenticates to obtain valid JWT token.
 * 2. Creates initial guest record with fingerprint, ipAddress, and userAgent.
 * 3. Records all timestamps and the UUID identifier.
 * 4. Updates same fingerprint with new ipAddress only.
 * 5. Validates partial update preserves userAgent and updates timestamps.
 * 6. Updates same fingerprint with new userAgent only.
 * 7. Validates final partial update preserves ipAddress and updates timestamps.
 */
export async function test_api_guest_existing_record_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate unique fingerprint for this test
  const fingerprint = `test-fingerprint-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  // 2. Create initial guest record with complete context
  const initialGuest = await api.functional.ecommerceMall.admin.guests.upsert(
    adminConnection,
    {
      body: {
        fingerprint: fingerprint,
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0",
      } satisfies IEcommerceMallGuest.IUpsert,
    },
  );
  typia.assert(initialGuest);
  // Record initial timestamps and identifier
  const initialId = initialGuest.id;
  const initialCreatedAt = initialGuest.createdAt;
  const initialUpdatedAt = initialGuest.updatedAt;
  const initialLastActiveAt = initialGuest.lastActiveAt;
  const initialUserAgent = initialGuest.userAgent;
  // 3. Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 4. Partial update - only ipAddress, omit userAgent
  const updatedGuest = await api.functional.ecommerceMall.admin.guests.upsert(
    adminConnection,
    {
      body: {
        fingerprint: fingerprint,
        ipAddress: "10.0.0.50",
      } satisfies IEcommerceMallGuest.IUpsert,
    },
  );
  typia.assert(updatedGuest);
  // 5. Validate partial update behavior
  TestValidator.equals("id preserved", updatedGuest.id, initialId);
  TestValidator.equals(
    "ipAddress updated",
    updatedGuest.ipAddress,
    "10.0.0.50",
  );
  TestValidator.equals(
    "userAgent preserved from step 2",
    updatedGuest.userAgent,
    initialUserAgent,
  );
  TestValidator.predicate(
    "lastActiveAt updated (more recent)",
    new Date(updatedGuest.lastActiveAt!).getTime() >
      new Date(initialLastActiveAt!).getTime(),
  );
  TestValidator.equals(
    "createdAt immutable",
    updatedGuest.createdAt,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt refreshed",
    new Date(updatedGuest.updatedAt).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );
  // Record second update timestamps
  const secondUpdatedAt = updatedGuest.updatedAt;
  const secondLastActiveAt = updatedGuest.lastActiveAt;
  const preservedIpAddress = updatedGuest.ipAddress;
  // Wait again to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Another partial update - only userAgent, omit ipAddress
  const finalGuest = await api.functional.ecommerceMall.admin.guests.upsert(
    adminConnection,
    {
      body: {
        fingerprint: fingerprint,
        userAgent: "Chrome/120.0",
      } satisfies IEcommerceMallGuest.IUpsert,
    },
  );
  typia.assert(finalGuest);
  // 7. Validate final partial update behavior
  TestValidator.equals("id still preserved", finalGuest.id, initialId);
  TestValidator.equals(
    "ipAddress preserved from step 4",
    finalGuest.ipAddress,
    preservedIpAddress,
  );
  TestValidator.equals(
    "userAgent updated",
    finalGuest.userAgent,
    "Chrome/120.0",
  );
  TestValidator.predicate(
    "lastActiveAt updated again",
    new Date(finalGuest.lastActiveAt!).getTime() >
      new Date(secondLastActiveAt!).getTime(),
  );
  TestValidator.equals(
    "createdAt still immutable",
    finalGuest.createdAt,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt refreshed again",
    new Date(finalGuest.updatedAt).getTime() >
      new Date(secondUpdatedAt).getTime(),
  );
}

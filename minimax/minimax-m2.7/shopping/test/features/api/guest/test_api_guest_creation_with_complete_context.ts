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
 * Test guest visitor creation with complete browsing context including IP address and user agent.
 *
 * Validates the guest upsert endpoint that creates new guest visitor records for unauthenticated platform visitors. The test verifies that when a device fingerprint is provided along with IP address and user agent, a new guest record is correctly created with all metadata properly stored and returned.
 *
 * **Endpoint Tested**: PATCH /ecommerceMall/admin/guests
 *
 * **Authentication**: Requires admin authorization via authorize_admin_join utility.
 *
 * **Test Data**: Generates a unique device fingerprint (UUID format) and sample browsing context including IPv4 address and browser user agent string.
 *
 * **Validation Focus**:
 * - Guest record is created with unique UUID identifier
 * - ipAddress and userAgent are stored and returned exactly as provided
 * - Timestamps (createdAt, updatedAt, lastActiveAt) are set to current time within tolerance
 * - Sensitive fingerprint field is NOT exposed in API response (security requirement)
 * - deletedAt field is NOT present in response
 *
 * 1. Authenticate as admin to access guest management endpoint.
 * 2. Generate unique device fingerprint and browsing context data.
 * 3. Call upsert endpoint to create guest record.
 * 4. Validate response structure and field values match expectations.
 * 5. Verify sensitive data is properly excluded from response.
 */
export async function test_api_guest_creation_with_complete_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access guest management endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate unique device fingerprint (UUID format for uniqueness)
  const fingerprint = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate browsing context data
  const ipAddress = "192.168.1.100" satisfies string & tags.Format<"ipv4">;
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  // 4. Call upsert endpoint to create guest record
  const guest = await api.functional.ecommerceMall.admin.guests.upsert(
    adminConnection,
    {
      body: {
        fingerprint,
        ipAddress,
        userAgent,
      } satisfies IEcommerceMallGuest.IUpsert,
    },
  );
  typia.assert(guest);
  // 5. Validate response contains required fields
  TestValidator.equals(
    "guest has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
    true,
  );
  TestValidator.equals("ipAddress matches input", guest.ipAddress, ipAddress);
  TestValidator.equals("userAgent matches input", guest.userAgent, userAgent);
  // 6. Validate timestamps are set to current time (within 1 second tolerance)
  const now = new Date();
  const oneSecondMs = 1000;
  const createdAt = new Date(guest.createdAt);
  TestValidator.predicate(
    "createdAt within 1 second of now",
    Math.abs(createdAt.getTime() - now.getTime()) <= oneSecondMs,
  );
  const updatedAt = new Date(guest.updatedAt);
  TestValidator.predicate(
    "updatedAt within 1 second of now",
    Math.abs(updatedAt.getTime() - now.getTime()) <= oneSecondMs,
  );
  const lastActiveAt = guest.lastActiveAt ? new Date(guest.lastActiveAt) : null;
  if (lastActiveAt !== null) {
    TestValidator.predicate(
      "lastActiveAt within 1 second of now",
      Math.abs(lastActiveAt.getTime() - now.getTime()) <= oneSecondMs,
    );
  }
  // 7. Verify fingerprint field is NOT present in response (security)
  TestValidator.predicate(
    "fingerprint not exposed in response",
    !("fingerprint" in guest),
  );
  // 8. Verify deletedAt field is NOT present in response
  TestValidator.predicate(
    "deletedAt not present in response",
    !("deletedAt" in guest),
  );
}

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
 * Test guest registration when the same device fingerprint already exists in the system.
 *
 * This test validates the returning guest scenario where:
 * 1. A guest account is created with a specific device fingerprint
 * 2. The same device fingerprint is used again for a second join request
 * 3. The system reuses the existing guest record (same guest id) instead of creating a duplicate
 * 4. Fresh JWT tokens are issued for the new session
 *
 * Business Rules Validated:
 * - Device fingerprint uniqueness is enforced at the guest account level
 * - Returning guests maintain their original guest id
 * - New sessions can be created for existing guests with updated connection metadata
 */
export async function test_api_guest_join_existing_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint to use for both join operations
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // First guest join: Create initial guest account
  const firstJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Second guest join: Use SAME device fingerprint but DIFFERENT session metadata
  // This simulates a returning guest accessing from a different page
  const secondJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Validate that the same guest record was reused (no duplicate created)
  TestValidator.equals(
    "guest id should be same for existing device fingerprint",
    firstJoin.id,
    secondJoin.id,
  );
  // Validate that fresh tokens were issued for the new session
  TestValidator.notEquals(
    "access token should be different for new session",
    firstJoin.token.access,
    secondJoin.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different for new session",
    firstJoin.token.refresh,
    secondJoin.token.refresh,
  );
}

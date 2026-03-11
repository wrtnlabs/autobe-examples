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

export async function test_api_guest_join_duplicate_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for testing
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // First registration - should succeed and create new guest account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstConnection, {
    body: {
      deviceFingerprint,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Store the original guest ID for comparison
  const originalGuestId: string = firstJoin.id;
  // Second registration with same device fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  // Test duplicate registration behavior
  // Business policy: either return existing account OR reject with error
  const duplicateJoin = await authorize_guest_join(secondConnection, {
    body: {
      deviceFingerprint,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(duplicateJoin);
  // Validate that duplicate registration returns the original guest ID
  TestValidator.equals(
    "duplicate registration returns original guest ID",
    duplicateJoin.id,
    originalGuestId,
  );
  // Validate that tokens are also consistent (same session or new session for same guest)
  TestValidator.predicate(
    "duplicate registration has valid tokens",
    duplicateJoin.token.access.length > 0 &&
      duplicateJoin.token.refresh.length > 0,
  );
}

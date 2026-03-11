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
 * Test guest registration workflow with device fingerprint.
 *
 * 1. Generate random device fingerprint
 * 2. Register guest with device fingerprint
 * 3. Validate response contains valid guest identifier and JWT tokens
 * 4. Validate expiration timestamps are in the future
 *
 * Note: The IJoin type only requires deviceFingerprint. Display name is optional
 * in the response but not configurable in the request.
 */
export async function test_api_guest_join_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration data with device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 2. Register guest using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(authorized);
  // 3. Validate guest identifier is valid UUID
  TestValidator.predicate(
    "guest id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 4. Validate JWT token structure exists
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // 5. Validate expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable until is in future",
    new Date(authorized.token.refreshable_until) > now,
  );
}

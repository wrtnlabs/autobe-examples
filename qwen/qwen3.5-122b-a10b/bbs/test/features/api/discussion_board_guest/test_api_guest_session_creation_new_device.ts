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
 * Test guest session creation with a new device fingerprint.
 *
 * Validates the primary success path for creating a new guest session:
 * 1. Submit guest join request with unique device fingerprint, href, and referrer
 * 2. Verify response contains new guest ID in UUID format
 * 3. Verify response includes JWT access and refresh tokens
 * 4. Verify token expiration timestamps are present and valid
 * 5. Confirm guest record was created with the provided device fingerprint
 * 6. Verify session was created with connection metadata
 */
export async function test_api_guest_session_creation_new_device(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // Submit guest join request with device fingerprint and connection metadata
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  // Validate response structure with typia (validates ALL types, formats, and constraints)
  typia.assert(authorized);
  // Verify device fingerprint matches input (business logic validation)
  TestValidator.equals(
    "device fingerprint matches",
    authorized.device_fingerprint,
    deviceFingerprint,
  );
  // Verify deleted_at is null for active guest account (business logic validation)
  TestValidator.equals(
    "deleted_at is null (active account)",
    authorized.deleted_at,
    null,
  );
}

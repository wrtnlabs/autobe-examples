import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test duplicate device fingerprint handling during guest registration.
 *
 * Validates that when a guest attempts to register with a device fingerprint that already exists in the system, the system correctly detects the duplicate and returns a 409 Conflict response containing the existing guest_id instead of creating a new account. This ensures idempotent behavior and allows clients to resume previous guest identities.
 *
 * The test workflow includes:
 * 1. First registration with a unique device fingerprint
 * 2. Second registration attempt with the same fingerprint
 * 3. Verification that the duplicate attempt returns 409 Conflict with original guest_id
 *
 * 1. Register first guest with unique device fingerprint
 *    1.1. Generate random device fingerprint
 *    1.2. Call guest join endpoint
 *    1.3. Verify successful registration returns guest_id
 * 2. Attempt duplicate registration with same fingerprint
 *    2.1. Use identical device fingerprint from step 1
 *    2.2. Expect 409 Conflict HTTP error
 *    2.3. Verify error response contains original guest_id
 * 3. Validate idempotent behavior
 *    3.1. Confirm same guest_id returned in both cases
 *    3.2. Verify no new guest record created
 */
export async function test_api_guest_registration_duplicate_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration with unique fingerprint
  const firstFingerprint = RandomGenerator.alphaNumeric(32);
  const firstConnection: api.IConnection = { host: connection.host };
  const firstRegistration: IRedditLikeGuest.IAuthorized =
    await authorize_guest_join(firstConnection, {
      body: {
        device_fingerprint: firstFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeGuest.IJoin,
    });
  typia.assert(firstRegistration);
  // Store the original guest_id for comparison
  const originalGuestId: string = firstRegistration.guest_id;
  // 2. Attempt duplicate registration with same fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate fingerprint should return 409 Conflict",
    409,
    async () => {
      await authorize_guest_join(secondConnection, {
        body: {
          device_fingerprint: firstFingerprint, // Same fingerprint as first registration
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditLikeGuest.IJoin,
      });
    },
  );
  // 3. Verify the error response contains the original guest_id
  try {
    await authorize_guest_join(secondConnection, {
      body: {
        device_fingerprint: firstFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeGuest.IJoin,
    });
    throw new Error("Expected 409 Conflict but request succeeded");
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) throw error;
    const httpError: api.HttpError = error;
    // Validate error status
    TestValidator.equals(
      "duplicate registration returns 409 status",
      httpError.status,
      409,
    );
    // Validate error response contains original guest_id
    const errorResponse = httpError.toJSON<IRedditLikeGuest.IAuthorized>();
    TestValidator.equals(
      "error response contains original guest_id",
      errorResponse.message.guest_id,
      originalGuestId,
    );
  }
}

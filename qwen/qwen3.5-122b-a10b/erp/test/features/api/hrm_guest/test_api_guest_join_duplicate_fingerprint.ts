import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
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
 * Validates that when the same device_fingerprint is submitted twice, the system maintains data integrity by either returning the existing guest record with new session tokens or rejecting the duplicate registration. This is critical for security and preventing duplicate guest identities in the system.
 *
 * The test covers two scenarios:
 * 1. First guest registration with unique fingerprint - should succeed
 * 2. Second registration attempt with identical fingerprint - should handle consistently (return existing or reject)
 *
 * 1. Create first guest with random device fingerprint and session context.
 * 2. Validate first join response contains valid UUID, JWT tokens, and session information.
 * 3. Attempt second guest join with the same device fingerprint.
 * 4. Verify system behavior: either returns existing guest with new tokens OR throws appropriate error.
 * 5. Ensure no duplicate guest records are created for the same fingerprint.
 * 6. Validate token generation works correctly in both scenarios.
 */
export async function test_api_guest_join_duplicate_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest with unique device fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  const firstGuest: IHrmGuest.IAuthorized = await authorize_guest_join(
    guestConnection1,
    {
      body: {
        device_fingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(firstGuest);
  // 2. Validate first guest registration response
  TestValidator.predicate(
    "first guest has valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstGuest.id),
  );
  TestValidator.predicate(
    "first guest has access token",
    firstGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "first guest has refresh token",
    firstGuest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "first guest has valid device fingerprint",
    firstGuest.device_fingerprint === deviceFingerprint,
  );
  TestValidator.predicate(
    "first guest has sessions",
    firstGuest.sessions.length > 0,
  );
  // 3. Attempt second guest join with SAME device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  try {
    const secondGuest: IHrmGuest.IAuthorized = await authorize_guest_join(
      guestConnection2,
      {
        body: {
          device_fingerprint: deviceFingerprint, // Same fingerprint as first guest
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IHrmGuest.IJoin,
      },
    );
    typia.assert(secondGuest);
    // 4a. If system returns existing guest (duplicate fingerprint policy: return existing)
    // Validate that the returned guest ID matches the first guest
    TestValidator.equals(
      "duplicate fingerprint returns same guest",
      secondGuest.id,
      firstGuest.id,
    );
    TestValidator.predicate(
      "second guest has new access token",
      secondGuest.token.access !== firstGuest.token.access,
    );
    TestValidator.predicate(
      "second guest has valid device fingerprint",
      secondGuest.device_fingerprint === deviceFingerprint,
    );
    // Verify sessions count - either same or increased (new session may or may not be created)
    TestValidator.predicate(
      "sessions exist for duplicate guest",
      secondGuest.sessions.length > 0,
    );
  } catch (error) {
    // 4b. If system rejects duplicate fingerprint (duplicate fingerprint policy: reject)
    if (typia.is<api.HttpError>(error)) {
      const httpError: api.HttpError = error;
      // Validate appropriate error status (409 Conflict or 400 Bad Request)
      TestValidator.predicate(
        "duplicate fingerprint rejected with appropriate status",
        httpError.status === 409 || httpError.status === 400,
      );
      // Validate error message mentions duplicate or fingerprint
      const errorMessage: string =
        typeof httpError.toJSON().message === "string"
          ? httpError.toJSON().message as string
          : JSON.stringify(httpError.toJSON().message);
      TestValidator.predicate(
        "error message mentions duplicate or fingerprint",
        errorMessage.toLowerCase().includes("duplicate") ||
          errorMessage.toLowerCase().includes("fingerprint") ||
          errorMessage.toLowerCase().includes("already"),
      );
    } else {
      throw error;
    }
  }
  // 5. Final validation: system correctly handles duplicate fingerprints
  // Either returns existing guest or rejects - both are valid behaviors
  // The key is that duplicate guest records are never created
}
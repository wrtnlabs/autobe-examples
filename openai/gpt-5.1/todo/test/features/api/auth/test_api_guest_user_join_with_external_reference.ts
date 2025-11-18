import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validate guest user join with external_ref correlation identifiers.
 *
 * Business purpose:
 *
 * - Ensure that POST /auth/guestUser/join correctly accepts a client-supplied
 *   external_ref, persists it for the created guest concept, and echoes it back
 *   in the ITodoAppGuestUser.IAuthorized response.
 * - Verify that token payloads and timestamps are coherent and that separate join
 *   calls yield distinct guest identities without cross-contamination.
 *
 * Scenario steps:
 *
 * 1. Generate a first opaque external_ref value (e.g., tracking-abc-123).
 * 2. Call api.functional.auth.guestUser.join with this external_ref and assert
 *    that:
 *
 *    - The response type matches ITodoAppGuestUser.IAuthorized.
 *    - Id is a non-empty UUID string.
 *    - External_ref in the response equals the supplied value when present.
 *    - Created_at and updated_at are valid date-time strings and updated_at is
 *         greater than or equal to created_at.
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until are valid future dates.
 *    - Top-level accessToken and refreshToken, when present, mirror token.access and
 *         token.refresh.
 * 3. Generate a second, different external_ref value (e.g., experiment-xyz-456)
 *    and perform another join call.
 * 4. Repeat the above validations for the second guest.
 * 5. Cross-check that:
 *
 *    - The two guests have different id values.
 *    - When both responses carry non-null/defined external_ref, they reflect the
 *         respective input external_ref strings and differ from each other.
 */
export async function test_api_guest_user_join_with_external_reference(
  connection: api.IConnection,
) {
  // Prepare two distinct external reference identifiers to mimic different
  // tracking or A/B test keys coming from the client side.
  const externalRef1 = "tracking-abc-123";
  const externalRef2 = "experiment-xyz-456";

  // 1) First guest join with externalRef1
  const firstGuest = await api.functional.auth.guestUser.join(connection, {
    body: {
      external_ref: externalRef1,
    } satisfies ITodoAppGuestUser.IJoinRequest,
  });
  typia.assert(firstGuest);

  // Basic id and token integrity checks for the first guest
  TestValidator.predicate(
    "first guest id should be a non-empty string",
    firstGuest.id.length > 0,
  );
  TestValidator.predicate(
    "first guest token.access should be a non-empty string",
    firstGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "first guest token.refresh should be a non-empty string",
    firstGuest.token.refresh.length > 0,
  );

  // Timestamp consistency for the first guest
  const firstCreatedAt = new Date(firstGuest.created_at);
  const firstUpdatedAt = new Date(firstGuest.updated_at);
  TestValidator.predicate(
    "first guest updated_at should be greater than or equal to created_at",
    firstUpdatedAt.getTime() >= firstCreatedAt.getTime(),
  );

  const firstNow = Date.now();
  const firstExpiredAt = new Date(firstGuest.token.expired_at);
  const firstRefreshableUntil = new Date(firstGuest.token.refreshable_until);
  TestValidator.predicate(
    "first guest token.expired_at should be in the future",
    firstExpiredAt.getTime() > firstNow,
  );
  TestValidator.predicate(
    "first guest token.refreshable_until should be in the future",
    firstRefreshableUntil.getTime() > firstNow,
  );

  // external_ref echo and top-level token mirrors for the first guest
  if (
    firstGuest.external_ref !== null &&
    firstGuest.external_ref !== undefined
  ) {
    TestValidator.equals(
      "first guest external_ref should match the supplied value",
      firstGuest.external_ref,
      externalRef1,
    );
  }

  if (firstGuest.accessToken !== undefined) {
    TestValidator.equals(
      "first guest accessToken should mirror token.access",
      firstGuest.accessToken,
      firstGuest.token.access,
    );
  }
  if (firstGuest.refreshToken !== undefined) {
    TestValidator.equals(
      "first guest refreshToken should mirror token.refresh",
      firstGuest.refreshToken,
      firstGuest.token.refresh,
    );
  }

  // 2) Second guest join with externalRef2
  const secondGuest = await api.functional.auth.guestUser.join(connection, {
    body: {
      external_ref: externalRef2,
    } satisfies ITodoAppGuestUser.IJoinRequest,
  });
  typia.assert(secondGuest);

  // Basic id and token integrity checks for the second guest
  TestValidator.predicate(
    "second guest id should be a non-empty string",
    secondGuest.id.length > 0,
  );
  TestValidator.predicate(
    "second guest token.access should be a non-empty string",
    secondGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "second guest token.refresh should be a non-empty string",
    secondGuest.token.refresh.length > 0,
  );

  // Timestamp consistency for the second guest
  const secondCreatedAt = new Date(secondGuest.created_at);
  const secondUpdatedAt = new Date(secondGuest.updated_at);
  TestValidator.predicate(
    "second guest updated_at should be greater than or equal to created_at",
    secondUpdatedAt.getTime() >= secondCreatedAt.getTime(),
  );

  const secondNow = Date.now();
  const secondExpiredAt = new Date(secondGuest.token.expired_at);
  const secondRefreshableUntil = new Date(secondGuest.token.refreshable_until);
  TestValidator.predicate(
    "second guest token.expired_at should be in the future",
    secondExpiredAt.getTime() > secondNow,
  );
  TestValidator.predicate(
    "second guest token.refreshable_until should be in the future",
    secondRefreshableUntil.getTime() > secondNow,
  );

  if (
    secondGuest.external_ref !== null &&
    secondGuest.external_ref !== undefined
  ) {
    TestValidator.equals(
      "second guest external_ref should match the supplied value",
      secondGuest.external_ref,
      externalRef2,
    );
  }

  if (secondGuest.accessToken !== undefined) {
    TestValidator.equals(
      "second guest accessToken should mirror token.access",
      secondGuest.accessToken,
      secondGuest.token.access,
    );
  }
  if (secondGuest.refreshToken !== undefined) {
    TestValidator.equals(
      "second guest refreshToken should mirror token.refresh",
      secondGuest.refreshToken,
      secondGuest.token.refresh,
    );
  }

  // 3) Cross-guest consistency: ids and external_refs must not be mixed.
  TestValidator.notEquals(
    "guest ids must differ across separate join calls",
    firstGuest.id,
    secondGuest.id,
  );

  if (
    firstGuest.external_ref !== null &&
    firstGuest.external_ref !== undefined &&
    secondGuest.external_ref !== null &&
    secondGuest.external_ref !== undefined
  ) {
    TestValidator.notEquals(
      "external_ref values for different guests should differ",
      firstGuest.external_ref,
      secondGuest.external_ref,
    );
  }
}

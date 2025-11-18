import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate guest join flow creates an authorized guest identity.
 *
 * Business goals:
 *
 * - An anonymous visitor can call POST /auth/guestUser/join without prior
 *   authentication and receive an ITodoAppGuestUser.IAuthorized payload.
 * - The payload contains a valid guest identity (id, lifecycle timestamps,
 *   optional metadata) and a fully populated IAuthorizationToken for subsequent
 *   guest-only operations.
 * - Repeated join calls continue to return structurally valid payloads regardless
 *   of whether the backend reuses or creates new guest records.
 *
 * Test steps:
 *
 * 1. Call api.functional.auth.guestUser.join with an empty body object, leveraging
 *    the optional display_name field in ITodoAppGuestUser.IJoin.
 * 2. Use typia.assert to validate the response matches
 *    ITodoAppGuestUser.IAuthorized.
 * 3. Perform basic business-level assertions on key fields without rechecking
 *    formats that typia.assert already validates:
 *
 *    - Id is a non-empty string.
 *    - Deleted_at is either null or undefined (active guest identity).
 *    - Token.access and token.refresh are non-empty strings.
 * 4. If metadata is present, ensure it only contains the documented fields
 *    userAgent and ipAddress by comparing against a projected object that drops
 *    any other keys.
 * 5. Call join multiple times, asserting each response individually and confirming
 *    that all token/access pairs are non-empty and that ids are non-empty
 *    strings. Do not assert relationships between ids.
 */
export async function test_api_guest_user_join_creates_new_identity(
  connection: api.IConnection,
) {
  // 1. First guest join with minimal body
  const firstAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {} satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(firstAuthorized);

  // Business-level checks on the first response
  TestValidator.predicate(
    "first join returns non-empty guest id",
    firstAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "first join deleted_at is null or undefined",
    firstAuthorized.deleted_at === null ||
      firstAuthorized.deleted_at === undefined,
  );

  // Token must be fully populated with non-empty strings
  TestValidator.predicate(
    "first join token.access is non-empty",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join token.refresh is non-empty",
    firstAuthorized.token.refresh.length > 0,
  );

  // If metadata is present, ensure only userAgent and ipAddress keys exist
  if (firstAuthorized.metadata !== undefined) {
    typia.assert<ITodoAppGuestUserMetadata>(firstAuthorized.metadata);

    const allowedKeys = ["userAgent", "ipAddress"] as const;
    const actualKeys = Object.keys(firstAuthorized.metadata);
    const hasOnlyAllowedKeys = actualKeys.every((key) =>
      allowedKeys.includes(key as (typeof allowedKeys)[number]),
    );
    TestValidator.predicate(
      "metadata contains only documented fields when present",
      hasOnlyAllowedKeys,
    );
  }

  // 2. Perform multiple additional join calls to ensure structural validity
  const additionalJoins: ITodoAppGuestUser.IAuthorized[] = [];
  for (let i = 0; i < 2; i++) {
    const authorized: ITodoAppGuestUser.IAuthorized =
      await api.functional.auth.guestUser.join(connection, {
        body: {} satisfies ITodoAppGuestUser.IJoin,
      });
    typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);
    additionalJoins.push(authorized);
  }

  // Validate each additional response individually
  additionalJoins.forEach((authorized, index) => {
    TestValidator.predicate(
      `join[${index}] returns non-empty guest id`,
      authorized.id.length > 0,
    );
    TestValidator.predicate(
      `join[${index}] deleted_at is null or undefined`,
      authorized.deleted_at === null || authorized.deleted_at === undefined,
    );
    TestValidator.predicate(
      `join[${index}] token.access is non-empty`,
      authorized.token.access.length > 0,
    );
    TestValidator.predicate(
      `join[${index}] token.refresh is non-empty`,
      authorized.token.refresh.length > 0,
    );
  });
}

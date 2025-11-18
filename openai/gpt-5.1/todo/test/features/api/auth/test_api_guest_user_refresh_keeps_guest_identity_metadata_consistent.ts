import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate that refreshing a guestUser authorization keeps the same guest
 * identity while updating only activity-related fields.
 *
 * Business purpose:
 *
 * - Ensure POST /auth/guestUser/refresh does not create a new guest identity but
 *   instead re-issues tokens and updates lifecycle metadata on the existing
 *   todo_app_guestusers row.
 * - Confirm that core identity fields (id, display_name) and creation timestamp
 *   remain stable across a refresh.
 * - Confirm that updated_at behaves like an activity/lifecycle marker that is
 *   monotonic (>= previous value) when a refresh occurs.
 * - Confirm that deleted_at remains null for an active guest in this happy path.
 *
 * Test flow:
 *
 * 1. Call POST /auth/guestUser/join with a deterministic ITodoAppGuestUser.IJoin
 *    payload (we can randomize display_name but it's optional) and capture the
 *    ITodoAppGuestUser.IAuthorized response as initialAuth.
 * 2. Immediately call POST /auth/guestUser/refresh using
 *    ITodoAppGuestUser.IRefresh, taking refresh_token from
 *    initialAuth.token.refresh, and capture the ITodoAppGuestUser.IAuthorized
 *    response as refreshedAuth.
 * 3. Use typia.assert() to validate both responses structurally.
 * 4. Assert identity and lifecycle semantics with TestValidator:
 *
 *    - Id is identical between initialAuth and refreshedAuth.
 *    - Display_name is strictly equal between both (covers undefined/null or string
 *         cases without trying to normalize them).
 *    - Created_at is exactly equal between both.
 *    - Updated_at in refreshedAuth is greater than or equal to updated_at in
 *         initialAuth when compared as date-time strings.
 *    - Deleted_at is null or undefined in both responses (active guest).
 * 5. Optionally, when metadata exists on both, assert that it is structurally
 *    valid and treat it as informational only; do not enforce strong equality
 *    since metadata may legitimately change between refresh calls.
 */
export async function test_api_guest_user_refresh_keeps_guest_identity_metadata_consistent(
  connection: api.IConnection,
) {
  // 1. Establish an initial guest identity via join
  const joinBody = {
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppGuestUser.IJoin;

  const initialAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(initialAuth);

  // 2. Immediately refresh using the refresh token from initialAuth
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies ITodoAppGuestUser.IRefresh;

  const refreshedAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  // 3. Assert that the same guest identity is preserved
  TestValidator.equals(
    "guest id must remain stable across refresh",
    refreshedAuth.id,
    initialAuth.id,
  );

  // 4. Assert display_name stability (covers undefined/null or a string)
  TestValidator.equals(
    "display_name must be preserved on refresh",
    refreshedAuth.display_name ?? null,
    initialAuth.display_name ?? null,
  );

  // 5. created_at must remain identical
  TestValidator.equals(
    "created_at must remain unchanged after refresh",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );

  // 6. updated_at should be >= previous updated_at
  const initialUpdatedAt = new Date(initialAuth.updated_at).getTime();
  const refreshedUpdatedAt = new Date(refreshedAuth.updated_at).getTime();

  TestValidator.predicate(
    "updated_at in refreshedAuth must be greater than or equal to initialAuth.updated_at",
    refreshedUpdatedAt >= initialUpdatedAt,
  );

  // 7. deleted_at must remain null/undefined for active guests on both payloads
  TestValidator.equals(
    "initialAuth.deleted_at must be null for active guest",
    initialAuth.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "refreshedAuth.deleted_at must be null for active guest",
    refreshedAuth.deleted_at ?? null,
    null,
  );

  // 8. Optional metadata checks – if both sides expose metadata, validate shape
  if (
    initialAuth.metadata !== undefined &&
    refreshedAuth.metadata !== undefined
  ) {
    // structural validation
    typia.assert<ITodoAppGuestUserMetadata>(initialAuth.metadata);
    typia.assert<ITodoAppGuestUserMetadata>(refreshedAuth.metadata);

    // We only assert that userAgent and ipAddress, if present, are non-empty
    // strings; we do not require them to be equal because infrastructure may
    // change them.
    if (initialAuth.metadata.userAgent !== undefined) {
      TestValidator.predicate(
        "initial metadata.userAgent must be a non-empty string when present",
        typeof initialAuth.metadata.userAgent === "string" &&
          initialAuth.metadata.userAgent.length > 0,
      );
    }
    if (refreshedAuth.metadata.userAgent !== undefined) {
      TestValidator.predicate(
        "refreshed metadata.userAgent must be a non-empty string when present",
        typeof refreshedAuth.metadata.userAgent === "string" &&
          refreshedAuth.metadata.userAgent.length > 0,
      );
    }

    if (initialAuth.metadata.ipAddress !== undefined) {
      TestValidator.predicate(
        "initial metadata.ipAddress must be a non-empty string when present",
        typeof initialAuth.metadata.ipAddress === "string" &&
          initialAuth.metadata.ipAddress.length > 0,
      );
    }
    if (refreshedAuth.metadata.ipAddress !== undefined) {
      TestValidator.predicate(
        "refreshed metadata.ipAddress must be a non-empty string when present",
        typeof refreshedAuth.metadata.ipAddress === "string" &&
          refreshedAuth.metadata.ipAddress.length > 0,
      );
    }
  }
}

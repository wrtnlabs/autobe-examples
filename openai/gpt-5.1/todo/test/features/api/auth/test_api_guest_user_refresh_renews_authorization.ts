import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

export async function test_api_guest_user_refresh_renews_authorization(
  connection: api.IConnection,
) {
  // 1. Establish initial guest authorization via join
  const joinBody = {
    // display_name is optional; generate a realistic nickname
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppGuestUser.IJoin;

  const initialAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(initialAuth);

  const guestId = initialAuth.id;
  const initialToken: IAuthorizationToken = initialAuth.token;

  // deleted_at may be undefined or null for active guests; treat undefined as null-equivalent
  TestValidator.equals(
    "initial guest deleted_at should be null or undefined",
    initialAuth.deleted_at ?? null,
    null,
  );

  // 2. Call refresh with the previously issued refresh token
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies ITodoAppGuestUser.IRefresh;

  const refreshedAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  const refreshedToken: IAuthorizationToken = refreshedAuth.token;

  // 3. Identity invariants: id must remain stable
  TestValidator.equals(
    "refreshed guest id must equal initial guest id",
    refreshedAuth.id,
    guestId,
  );

  // 4. deleted_at must remain null (or undefined interpreted as null)
  TestValidator.equals(
    "refreshed guest deleted_at should remain null or undefined",
    refreshedAuth.deleted_at ?? null,
    null,
  );

  // 5. display_name should be preserved if it was present
  if (
    initialAuth.display_name !== null &&
    initialAuth.display_name !== undefined
  ) {
    TestValidator.equals(
      "display_name must be preserved across refresh",
      refreshedAuth.display_name,
      initialAuth.display_name,
    );
  }

  // 6. created_at must be stable; updated_at must not go backwards
  const initialCreatedAt = new Date(initialAuth.created_at);
  const refreshedCreatedAt = new Date(refreshedAuth.created_at);
  TestValidator.equals(
    "created_at must remain stable across refresh",
    refreshedCreatedAt.toISOString(),
    initialCreatedAt.toISOString(),
  );

  const initialUpdatedAt = new Date(initialAuth.updated_at);
  const refreshedUpdatedAt = new Date(refreshedAuth.updated_at);
  TestValidator.predicate(
    "updated_at after refresh must be >= initial updated_at",
    refreshedUpdatedAt.getTime() >= initialUpdatedAt.getTime(),
  );

  // 7. Token renewal semantics
  // Access token should either change or have a strictly later expiry
  if (refreshedToken.access !== initialToken.access) {
    TestValidator.notEquals(
      "refreshed access token should differ from initial when rotated",
      refreshedToken.access,
      initialToken.access,
    );
  } else {
    const initialAccessExpiry = new Date(initialToken.expired_at).getTime();
    const refreshedAccessExpiry = new Date(refreshedToken.expired_at).getTime();
    TestValidator.predicate(
      "when access token is reused, its expiry must be extended",
      refreshedAccessExpiry > initialAccessExpiry,
    );
  }

  // Refresh token must be present and non-empty, but may or may not rotate
  TestValidator.predicate(
    "refreshed refresh token must be a non-empty string",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );
}

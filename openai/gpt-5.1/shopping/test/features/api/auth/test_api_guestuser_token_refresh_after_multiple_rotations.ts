import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

export async function test_api_guestuser_token_refresh_after_multiple_rotations(
  connection: api.IConnection,
) {
  // 1. Create initial guest user via join
  const initialAuth: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        external_reference: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallGuestUser.IJoin,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(initialAuth);
  typia.assert<IAuthorizationToken>(initialAuth.token);

  // Preserve initial identity and token snapshots
  const initialId: string = initialAuth.id;
  const initialToken: IAuthorizationToken = initialAuth.token;

  // 2. First refresh using initial refresh token
  const authorized1: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: initialToken.refresh,
      } satisfies IShoppingMallGuestUser.IRefresh,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(authorized1);
  typia.assert<IAuthorizationToken>(authorized1.token);

  // 3. Second refresh using the first refresh response
  const authorized2: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: authorized1.token.refresh,
      } satisfies IShoppingMallGuestUser.IRefresh,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(authorized2);
  typia.assert<IAuthorizationToken>(authorized2.token);

  // 4. Identity must remain stable across all rotations
  TestValidator.equals(
    "guest id remains constant after first refresh",
    authorized1.id,
    initialId,
  );
  TestValidator.equals(
    "guest id remains constant after second refresh",
    authorized2.id,
    initialId,
  );

  // 5. Access tokens should rotate over time
  TestValidator.notEquals(
    "access token should change between join and first refresh",
    authorized1.token.access,
    initialToken.access,
  );

  TestValidator.notEquals(
    "access token should change between first and second refresh",
    authorized2.token.access,
    authorized1.token.access,
  );

  // 6. Temporal progression: expired_at and refreshable_until should not move backwards
  const initialExpiredAt = new Date(initialToken.expired_at);
  const firstExpiredAt = new Date(authorized1.token.expired_at);
  const secondExpiredAt = new Date(authorized2.token.expired_at);

  const initialRefreshableUntil = new Date(initialToken.refreshable_until);
  const firstRefreshableUntil = new Date(authorized1.token.refreshable_until);
  const secondRefreshableUntil = new Date(authorized2.token.refreshable_until);

  TestValidator.predicate(
    "first refresh expired_at should be on or after initial expired_at",
    firstExpiredAt.getTime() >= initialExpiredAt.getTime(),
  );
  TestValidator.predicate(
    "second refresh expired_at should be on or after first refresh expired_at",
    secondExpiredAt.getTime() >= firstExpiredAt.getTime(),
  );

  TestValidator.predicate(
    "first refresh refreshable_until should be on or after initial refreshable_until",
    firstRefreshableUntil.getTime() >= initialRefreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "second refresh refreshable_until should be on or after first refresh refreshable_until",
    secondRefreshableUntil.getTime() >= firstRefreshableUntil.getTime(),
  );
}

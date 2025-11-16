import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

export async function test_api_guest_user_refresh_respects_refresh_window(
  connection: api.IConnection,
) {
  // 1. Issue initial guestUser authorized context via join
  const initialAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(initialAuth);

  const initialToken: IAuthorizationToken = initialAuth.token;
  typia.assert<IAuthorizationToken>(initialToken);

  // 2. First refresh attempt with original refresh token
  const refreshedAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refreshToken: initialToken.refresh,
      } satisfies ICommunityPlatformGuestuser.IRefresh,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshedAuth);

  const refreshedToken: IAuthorizationToken = refreshedAuth.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // Business assertions: same guestUser id, but different expiry windows
  TestValidator.equals(
    "guest user id is preserved across refresh",
    refreshedAuth.id,
    initialAuth.id,
  );

  TestValidator.notEquals(
    "access token expiry should change on refresh",
    refreshedToken.expired_at,
    initialToken.expired_at,
  );

  TestValidator.notEquals(
    "refresh window should be advanced on refresh",
    refreshedToken.refreshable_until,
    initialToken.refreshable_until,
  );

  // 3. Second refresh attempt with an invalid/"expired" refresh token
  const invalidRefreshToken: string = `${initialToken.refresh}-tampered`;

  await TestValidator.error(
    "refresh with tampered/invalid token must fail",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies ICommunityPlatformGuestuser.IRefresh,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests successful token refresh for a registered user.
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // Capture original tokens
  const originalToken = authorized.token;
  // 2. Token refresh using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_user_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshed);
  // 3. Check that new tokens are returned and are different
  TestValidator.predicate(
    "access token refreshed",
    refreshed.token.access !== originalToken.access &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshed",
    refreshed.token.refresh !== originalToken.refresh &&
      refreshed.token.refresh.length > 0,
  );
  // 4. Validate expiration timestamps format and logical order
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is a valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is a valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refresh expired_at is before refreshable_until",
    expiredAt < refreshableUntil,
  );
  // 5. Authorization header updated with new access token
  TestValidator.predicate(
    "authorization header updated",
    refreshConnection.headers?.Authorization === refreshed.token.access,
  );
}

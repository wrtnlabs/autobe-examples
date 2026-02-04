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

export async function test_api_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user
  const email = typia.random<string & tags.MinLength<5> & tags.MaxLength<254> & tags.Format<"email">>();
  const password = typia.random<
    string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">
  >();
  const displayName = typia.random<
    string &
      tags.MinLength<2> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const newUser = await authorize_user_join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    },
  });
  // 2. Use refresh token to get new tokens
  const refreshedTokens = await authorize_user_refresh(connection, {
    body: {
      refresh: newUser.token.refresh,
    },
  });
  // 3. Verify tokens are different
  TestValidator.notEquals(
    "new access token is different from old",
    newUser.token.access,
    refreshedTokens.token.access,
  );
  // 4. Verify new expiration times are in the future
  const oldExpiredAt = new Date(newUser.token.expired_at);
  const newExpiredAt = new Date(refreshedTokens.token.expired_at);
  TestValidator.predicate(
    "new access token expiration is in the future",
    newExpiredAt > oldExpiredAt,
  );
  // 5. Verify refreshable_until is updated
  const oldRefreshableUntil = new Date(newUser.token.refreshable_until);
  const newRefreshableUntil = new Date(refreshedTokens.token.refreshable_until);
  TestValidator.predicate(
    "new refreshable_until is in the future",
    newRefreshableUntil > oldRefreshableUntil,
  );
  TestValidator.predicate(
    "new refreshable_until is later than old",
    newRefreshableUntil > oldRefreshableUntil,
  );
}
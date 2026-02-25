import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_successful_token_exchange(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate user by creating new user account (join operation)
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: `https://${RandomGenerator.alphabets(10)}.com/auth/join`,
    referrer: `https://${RandomGenerator.alphabets(10)}.com/referrer`,
    ip: null,
  };
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Use the issued refresh token to call the refresh endpoint
  const refreshBody: IMultiUserTodoUser.IRefresh = {
    refresh: authorized.token.refresh,
  };
  const refreshed = await authorize_user_refresh(userConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // Verify new tokens are returned and expiration times are valid ISO date strings
  TestValidator.predicate(
    "refresh token rotation - new access token differs",
    refreshed.token.access !== authorized.token.access,
  );
  TestValidator.predicate(
    "refresh token rotation - new refresh token differs",
    refreshed.token.refresh !== authorized.token.refresh,
  );
  TestValidator.predicate(
    "refresh token - access expiration valid ISO date",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token - refresh expiration valid ISO date",
    !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
  // Confirm user ID and display name match
  TestValidator.equals(
    "user id matches after refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "display name matches after refresh",
    refreshed.displayName,
    authorized.displayName,
  );
}

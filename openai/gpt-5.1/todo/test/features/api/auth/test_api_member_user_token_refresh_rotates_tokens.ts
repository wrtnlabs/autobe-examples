import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_token_refresh_rotates_tokens(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain initial authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // display_name is optional; generate a realistic value
    display_name: RandomGenerator.name(),
    // ip is optional; leave undefined so that backend may derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const initialAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(initialAuth);

  // Extract initial tokens and basic identity
  const initialToken: IAuthorizationToken = initialAuth.token;
  typia.assert<IAuthorizationToken>(initialToken);

  const initialAccess = initialToken.access;
  const initialRefresh = initialToken.refresh;

  // Basic sanity checks for initial tokens
  TestValidator.predicate(
    "initial access token should be non-empty string",
    typeof initialAccess === "string" && initialAccess.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be non-empty string",
    typeof initialRefresh === "string" && initialRefresh.length > 0,
  );

  // 2. Call refresh endpoint using the initial refresh token
  const refreshRequestBody = {
    refreshToken: initialRefresh,
  } satisfies ITodoAppMemberUserRefresh.IRequest;

  const refreshedAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(refreshedAuth);

  const refreshedToken: IAuthorizationToken = refreshedAuth.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  const refreshedAccess = refreshedToken.access;
  const refreshedRefresh = refreshedToken.refresh;

  // 3. Validate that new tokens are non-empty
  TestValidator.predicate(
    "refreshed access token should be non-empty string",
    typeof refreshedAccess === "string" && refreshedAccess.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty string",
    typeof refreshedRefresh === "string" && refreshedRefresh.length > 0,
  );

  // 4. Validate token rotation: access and refresh tokens should differ
  TestValidator.notEquals(
    "refreshed access token must differ from initial access token",
    refreshedAccess,
    initialAccess,
  );
  TestValidator.notEquals(
    "refreshed refresh token must differ from initial refresh token",
    refreshedRefresh,
    initialRefresh,
  );

  // 5. Validate that member identity remains the same (id and email)
  TestValidator.equals(
    "member id must remain the same after token refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email must remain the same after token refresh",
    refreshedAuth.email,
    initialAuth.email,
  );

  // Note: We intentionally do not test using the old tokens against other
  // APIs because no additional endpoints are provided in this context. The
  // main contract validated here is that refresh rotates tokens while
  // preserving the underlying member user identity.
}

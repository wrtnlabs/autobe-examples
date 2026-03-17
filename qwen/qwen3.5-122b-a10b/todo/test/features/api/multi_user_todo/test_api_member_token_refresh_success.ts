import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Verify initial account state
  TestValidator.predicate("account is active", initialAuth.deleted_at === null);
  TestValidator.predicate(
    "has access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    initialAuth.token.refresh.length > 0,
  );
  // 3. Store initial token values for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 4. Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 5. Verify member identity remains consistent
  TestValidator.equals("member id unchanged", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "email unchanged",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals("name unchanged", refreshedAuth.name, initialAuth.name);
  TestValidator.equals(
    "account still active",
    refreshedAuth.deleted_at,
    initialAuth.deleted_at,
  );
  // 6. Verify new tokens are generated (may or may not be rotated depending on implementation)
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  // 7. Verify token expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(refreshedAuth.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(refreshedAuth.token.refreshable_until),
  );
  // 8. Verify new tokens have future expiration (tokens are valid)
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token expires in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
}

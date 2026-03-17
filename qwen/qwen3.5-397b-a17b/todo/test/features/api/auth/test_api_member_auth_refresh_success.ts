import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Store initial token information for comparison
  const initialToken = joinResult.token;
  const initialExpiredAt = initialToken.expired_at;
  const initialRefreshableUntil = initialToken.refreshable_until;
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult: ITodoAppMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: initialToken.refresh,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Validate new tokens are issued
  const newToken = refreshResult.token;
  // Verify new access token is different from initial
  TestValidator.notEquals(
    "access token refreshed",
    initialToken.access,
    newToken.access,
  );
  // Verify new refresh token is issued
  TestValidator.notEquals(
    "refresh token refreshed",
    initialToken.refresh,
    newToken.refresh,
  );
  // Verify expiration timestamps are updated
  TestValidator.notEquals(
    "expired_at updated",
    initialExpiredAt,
    newToken.expired_at,
  );
  // Verify refreshable_until is valid (extended or same)
  TestValidator.predicate(
    "refreshable_until is valid",
    new Date(newToken.refreshable_until) >= new Date(initialRefreshableUntil),
  );
  // 5. Verify member identity remains the same after refresh
  TestValidator.equals("member id unchanged", joinResult.id, refreshResult.id);
  TestValidator.equals(
    "email unchanged",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "display_name unchanged",
    joinResult.display_name,
    refreshResult.display_name,
  );
}

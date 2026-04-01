import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
  // 1. Register new member account and obtain initial authentication tokens
  const joinResult: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Extract refresh token from join response for token refresh operation
  const refreshToken: string = joinResult.token.refresh;
  // 3. Call refresh endpoint with the refresh token to obtain new token pair
  const refreshResult: IHrmPlatformMember.IAuthorized =
    await authorize_member_refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Verify member profile information matches original joined member
  TestValidator.equals("member id matches", refreshResult.id, joinResult.id);
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  TestValidator.equals(
    "display_name matches",
    refreshResult.display_name,
    joinResult.display_name,
  );
  // 5. Verify new tokens have valid expiration timestamps (in the future)
  const now: Date = new Date();
  const expiredAtDate: Date = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate: Date = new Date(
    refreshResult.token.refreshable_until,
  );
  TestValidator.predicate(
    "access token expires in future",
    expiredAtDate > now,
  );
  TestValidator.predicate(
    "refresh token valid in future",
    refreshableUntilDate > now,
  );
  // 6. Verify token rotation - new access token differs from original
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 7. Verify refreshable_until is later than expired_at (refresh token outlives access token)
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntilDate > expiredAtDate,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a fresh admin account to obtain initial token pair
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        email: adminEmail,
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(joinResult);
  // Step 2: Extract the refresh token from the initial authentication
  const refreshToken = joinResult.token.refresh;
  // Step 3: Use the refresh token to obtain a new access token
  const refreshResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_refresh(connection, {
      body: {
        refreshToken,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    });
  typia.assert(refreshResult);
  typia.assert<IAuthorizationToken>(refreshResult.token);
  // Step 4: Confirm token rotation occurred (new token is different from original)
  TestValidator.notEquals(
    "new access token is different from original",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from original",
    refreshResult.token.refresh,
    refreshToken,
  );
  // Verify refreshable_until is after current time
  const now = new Date().toISOString();
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshResult.token.refreshable_until) > new Date(now),
  );
}

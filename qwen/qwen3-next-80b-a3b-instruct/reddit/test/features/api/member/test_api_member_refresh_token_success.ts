import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(authorized);
  // Step 2: Extract the refresh token from the authorized response
  const refreshToken: string = authorized.token.refresh;
  // Step 3: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: ICommunityBbsMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityBbsMember.IRefresh,
    });
  typia.assert(refreshed);
  // Step 4: Validate that member identity is preserved
  TestValidator.equals("member ID preserved", refreshed.id, authorized.id);
  TestValidator.equals(
    "member email preserved",
    refreshed.email,
    authorized.email,
  );
  TestValidator.equals(
    "member display_name preserved",
    refreshed.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "member status preserved",
    refreshed.status,
    authorized.status,
  );
  TestValidator.equals(
    "member karma_score preserved",
    refreshed.karma_score,
    authorized.karma_score,
  );
  TestValidator.equals(
    "member account_verified preserved",
    refreshed.account_verified,
    authorized.account_verified,
  );
  TestValidator.equals(
    "member created_at preserved",
    refreshed.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "member member_duration_days preserved",
    refreshed.member_duration_days,
    authorized.member_duration_days,
  );
  TestValidator.equals(
    "member recent_activity_score preserved",
    refreshed.recent_activity_score,
    authorized.recent_activity_score,
  );
  // Step 5: Validate that new access token is issued
  TestValidator.notEquals(
    "new access token issued",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "new expiration time",
    refreshed.token.expired_at,
    authorized.token.expired_at,
  );
  TestValidator.equals(
    "refresh token preserved",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
  TestValidator.notEquals(
    "refreshable_until updated",
    refreshed.token.refreshable_until,
    authorized.token.refreshable_until,
  );
}

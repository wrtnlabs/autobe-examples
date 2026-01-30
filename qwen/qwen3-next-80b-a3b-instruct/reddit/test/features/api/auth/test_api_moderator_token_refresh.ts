import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account using authorize utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData: ICommunityBbsModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  };
  const joinedModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: moderatorJoinData,
    });
  typia.assert(joinedModerator);
  // Step 2: Authenticate moderator to obtain initial access and refresh tokens using authorize utility function
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLoginData: ICommunityBbsModerator.ILogin = {
    email: joinedModerator.email,
    password_hash: moderatorJoinData.password_hash,
  };
  const authenticatedModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_login(moderatorLoginConnection, {
      body: moderatorLoginData,
    });
  typia.assert(authenticatedModerator);
  // Step 3: Verify refresh token is present and use it to refresh access token using authorize utility function
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshData: ICommunityBbsModerator.IRefresh = {
    refresh_token: authenticatedModerator.token.refresh,
  };
  const refreshedModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_refresh(refreshConnection, { body: refreshData });
  typia.assert(refreshedModerator);
  // Step 4: Validation: Ensure refresh token remains unchanged
  TestValidator.equals(
    "refresh token unchanged",
    refreshedModerator.token.refresh,
    authenticatedModerator.token.refresh,
  );
  // Step 5: Validation: Ensure access token is different (new token issued)
  TestValidator.notEquals(
    "access token renewed",
    refreshedModerator.token.access,
    authenticatedModerator.token.access,
  );
  // Step 6: Validation: Verify moderator metadata remains intact
  TestValidator.equals(
    "moderator id preserved",
    refreshedModerator.id,
    authenticatedModerator.id,
  );
  TestValidator.equals(
    "moderator email preserved",
    refreshedModerator.email,
    authenticatedModerator.email,
  );
  TestValidator.equals(
    "moderator created_at preserved",
    refreshedModerator.created_at,
    authenticatedModerator.created_at,
  );
  TestValidator.equals(
    "moderator updated_at preserved",
    refreshedModerator.updated_at,
    authenticatedModerator.updated_at,
  );
  TestValidator.equals(
    "moderator user_id preserved",
    refreshedModerator.user_id,
    authenticatedModerator.user_id,
  );
  TestValidator.equals(
    "moderator assigned_communities preserved",
    refreshedModerator.assigned_communities,
    authenticatedModerator.assigned_communities,
  );
  TestValidator.equals(
    "moderator permissions_level preserved",
    refreshedModerator.permissions_level,
    authenticatedModerator.permissions_level,
  );
  TestValidator.equals(
    "moderator status preserved",
    refreshedModerator.status,
    authenticatedModerator.status,
  );
  TestValidator.equals(
    "moderator token_type preserved",
    refreshedModerator.token_type,
    authenticatedModerator.token_type,
  );
  // Step 7: Validation: Ensure new access token has different expiration
  TestValidator.notEquals(
    "access token expired_at renewed",
    refreshedModerator.token.expired_at,
    authenticatedModerator.token.expired_at,
  );
  TestValidator.equals(
    "refreshable_until preserved",
    refreshedModerator.token.refreshable_until,
    authenticatedModerator.token.refreshable_until,
  );
}

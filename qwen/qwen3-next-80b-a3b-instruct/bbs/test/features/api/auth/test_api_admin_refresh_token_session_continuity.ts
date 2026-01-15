import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_refresh_token_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account with generated credentials
  const generatedEmail: string = typia.random<string & tags.Format<"email">>();
  const generatedPassword: string = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin: IAdmin.IAuthorized = await authorize_admin_join(
    joinConnection,
    {
      body: {
        email: generatedEmail,
        password: generatedPassword,
      },
    },
  );
  typia.assert(joinedAdmin);
  // Step 2: Authenticate the admin to obtain initial access and refresh tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin: IAdmin.IAuthorized = await authorize_admin_login(
    loginConnection,
    {
      body: {
        email: generatedEmail,
        password: generatedPassword,
      },
    },
  );
  typia.assert(loggedAdmin);
  // Step 3: Verify initial token expiration times are set
  const initialExpiresAt = loggedAdmin.token.expired_at;
  const initialRefreshableUntil = loggedAdmin.token.refreshable_until;
  // Step 4: Use the refresh token to obtain a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin: IAdmin.IAuthorized = await authorize_admin_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: loggedAdmin.token.refresh,
      },
    },
  );
  typia.assert(refreshedAdmin);
  // Step 5: Validate that new tokens have extended expiration times
  const newExpiresAt = refreshedAdmin.token.expired_at;
  const newRefreshableUntil = refreshedAdmin.token.refreshable_until;
  TestValidator.predicate(
    "new access token expiration is after initial one",
    new Date(newExpiresAt) > new Date(initialExpiresAt),
  );
  TestValidator.predicate(
    "new refresh token expiration is after initial one",
    new Date(newRefreshableUntil) > new Date(initialRefreshableUntil),
  );
  // Step 6: Verify that the original refresh token is now invalidated
  // Attempting to reuse the original refresh token should fail
  await TestValidator.error(
    "reusing old refresh token should fail",
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {
          refresh_token: loggedAdmin.token.refresh,
        },
      });
    },
  );
  // Step 7: Confirm the new refresh token is different from the initial one
  TestValidator.notEquals(
    "new refresh token is different from initial one",
    refreshedAdmin.token.refresh,
    loggedAdmin.token.refresh,
  );
}

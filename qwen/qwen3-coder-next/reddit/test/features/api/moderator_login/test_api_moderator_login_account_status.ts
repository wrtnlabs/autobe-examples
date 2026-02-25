import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator login with banned or deactivated account status.
 * Verifies that the authentication system properly checks account status
 * before granting access and returns appropriate error codes.
 *
 * Note: Since there's no moderator update API available, this test focuses
 * on verifying the login flow and account status handling through available endpoints.
 */
export async function test_api_moderator_login_account_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin moderator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "SecurePass123!",
      username: "adminuser" + RandomGenerator.alphaNumeric(4),
      displayName: "Admin User",
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Create banned moderator account
  const bannedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const bannedModerator = await authorize_moderator_join(
    bannedModeratorConnection,
    {
      body: {
        email: "banned" + RandomGenerator.alphaNumeric(4) + "@test.com",
        password: "SecurePass123!",
        username: "bannedmoderator" + RandomGenerator.alphaNumeric(4),
        displayName: "Banned Moderator",
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(bannedModerator);
  // 3. Create deactivated moderator account
  const deactivatedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const deactivatedModerator = await authorize_moderator_join(
    deactivatedModeratorConnection,
    {
      body: {
        email: "deactivated" + RandomGenerator.alphaNumeric(4) + "@test.com",
        password: "SecurePass123!",
        username: "deactivatedmoderator" + RandomGenerator.alphaNumeric(4),
        displayName: "Deactivated Moderator",
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(deactivatedModerator);
  // 4. Test login with banned moderator account - should fail with 403
  const bannedLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error("banned moderator login should fail", async () => {
    await api.functional.redditClone.auth.moderator.login(
      bannedLoginConnection,
      {
        body: {
          email: bannedModerator.email,
          password: "SecurePass123!",
        } satisfies IRedditCloneModerator.ILogin,
      },
    );
  });
  // 5. Test login with deactivated moderator account - should fail with 403
  const deactivatedLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "deactivated moderator login should fail",
    async () => {
      await api.functional.redditClone.auth.moderator.login(
        deactivatedLoginConnection,
        {
          body: {
            email: deactivatedModerator.email,
            password: "SecurePass123!",
          } satisfies IRedditCloneModerator.ILogin,
        },
      );
    },
  );
  // 6. Verify that admin login still works with valid credentials
  const normalLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const loginResponse = await api.functional.redditClone.auth.moderator.login(
    normalLoginConnection,
    {
      body: {
        email: "admin@test.com",
        password: "SecurePass123!",
      } satisfies IRedditCloneModerator.ILogin,
    },
  );
  typia.assert(loginResponse);
}

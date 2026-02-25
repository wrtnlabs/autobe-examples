import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_token_refresh_revoked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Login as the moderator to obtain refresh token
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const loggedin = await api.functional.redditClone.auth.moderator.login(
    moderatorLoginConnection,
    {
      body: {
        email: moderator.email,
        password: password satisfies string as string,
      } satisfies IRedditCloneModerator.ILogin,
    },
  );
  typia.assert(loggedin);
  // 3. Extract the refresh token from the login response
  const refreshToken = loggedin.token.refresh;
  // 4. Trigger session invalidation by changing password
  const moderatorPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.redditClone.member.users.me.change_password.updatePassword(
    moderatorPasswordConnection,
    {
      body: {
        currentPassword: password satisfies string as string,
        newPassword: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCloneMember.IChangePassword,
    },
  );
  // 5. Try to refresh token with the revoked refresh token
  // This should fail with 401 Unauthorized
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject revoked refresh token", async () => {
    await api.functional.redditClone.auth.moderator.refresh(refreshConnection, {
      body: {
        refreshToken,
      } satisfies IRedditCloneModerator.IRefresh,
    });
  });
}
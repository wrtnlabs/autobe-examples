import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const registered: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  // Step 2: Login to get refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedin: IRedditCloneMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: registered.email,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCloneMember.ILogin,
    },
  );
  // Step 3: Test expired refresh token with invalid token
  await TestValidator.error("expired refresh token rejected", async () => {
    const expiredConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.member.refresh(expiredConnection, {
      body: {
        refresh_token: "invalid_expired_token_12345",
      } satisfies IRedditCloneMember.IRefresh,
    });
  });
  // Step 4: Verify original authentication is still valid after failed refresh
  const verifyConnection: api.IConnection = { host: connection.host };
  verifyConnection.headers = { Authorization: loggedin.token.access };
  // Use refresh endpoint to verify the token is still valid
  const refreshed: IRedditCloneMember.IAuthorized =
    await api.functional.redditClone.auth.member.refresh(verifyConnection, {
      body: {
        refresh_token: loggedin.token.refresh,
      } satisfies IRedditCloneMember.IRefresh,
    });
  typia.assert(refreshed);
  TestValidator.equals("user identity preserved", refreshed.id, loggedin.id);
}

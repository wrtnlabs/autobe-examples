import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: User registration to obtain valid tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorized);
  // Refresh token successful scenario
  {
    const newUserConnection: api.IConnection = { host: connection.host };
    const refreshResponse = await authorize_user_refresh(newUserConnection, {
      body: {
        refreshToken: authorized.token.refresh,
      },
    });
    typia.assert(refreshResponse);
    // Verify returned user details match original join
    TestValidator.equals("id matches", refreshResponse.id, authorized.id);
    TestValidator.equals(
      "email matches",
      refreshResponse.email,
      authorized.email,
    );
    TestValidator.equals(
      "username matches",
      refreshResponse.username,
      authorized.username,
    );
    TestValidator.equals(
      "display_name matches",
      refreshResponse.display_name,
      authorized.display_name,
    );
    // Verify token fields exist and have valid expiration timestamps
    TestValidator.predicate(
      "access token is non-empty",
      refreshResponse.token.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token is non-empty",
      refreshResponse.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "expired_at is valid ISO string",
      !Number.isNaN(Date.parse(refreshResponse.token.expired_at)),
    );
    TestValidator.predicate(
      "refreshable_until is valid ISO string",
      !Number.isNaN(Date.parse(refreshResponse.token.refreshable_until)),
    );
  }
  // Refresh token failure scenario: expired refresh token
  {
    const expiredToken = "expired.token.example.value";
    const expiredConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError(
      "expired refresh token returns 401",
      401,
      async () => {
        await authorize_user_refresh(expiredConnection, {
          body: { refreshToken: expiredToken },
        });
      },
    );
  }
  // Refresh token failure scenario: invalid refresh token
  {
    const invalidToken = "invalid.token.example.value";
    const invalidConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError(
      "invalid refresh token returns 401",
      401,
      async () => {
        await authorize_user_refresh(invalidConnection, {
          body: { refreshToken: invalidToken },
        });
      },
    );
  }
}

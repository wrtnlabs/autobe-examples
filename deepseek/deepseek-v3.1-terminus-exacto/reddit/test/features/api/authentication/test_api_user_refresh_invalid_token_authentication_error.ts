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

export async function test_api_user_refresh_invalid_token_authentication_error(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and obtain valid tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(authorized);
  // Extract valid refresh token for tampering tests
  const validRefreshToken = authorized.token.refresh;
  // Test 1: Empty string token
  await TestValidator.httpError(
    "empty refresh token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.refresh(userConnection, {
        body: {
          refresh_token: "",
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
  // Test 2: Random alphanumeric string
  await TestValidator.httpError(
    "random string token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.refresh(userConnection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
  // Test 3: Tampered token (modify last character)
  if (validRefreshToken.length > 0) {
    const tamperedToken =
      validRefreshToken.slice(0, -1) +
      (validRefreshToken.slice(-1) === "a" ? "b" : "a");
    await TestValidator.httpError(
      "tampered token should return 401",
      401,
      async () => {
        await api.functional.communityPlatform.auth.user.refresh(
          userConnection,
          {
            body: {
              refresh_token: tamperedToken,
            } satisfies ICommunityPlatformUser.IRefresh,
          },
        );
      },
    );
  }
  // Test 4: Malformed JSON-like string
  await TestValidator.httpError(
    "malformed JSON string token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.refresh(userConnection, {
        body: {
          refresh_token: '{"invalid": "token"}',
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
  // Test 5: Very long invalid token
  await TestValidator.httpError(
    "very long invalid token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.refresh(userConnection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(512),
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
  // Test 6: Valid format but non-existent token (UUID)
  await TestValidator.httpError(
    "non-existent UUID token should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.refresh(userConnection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
  // Note: We cannot test revoked tokens without a logout/revoke endpoint
  // in the current API. The scenario mentions revoked tokens, but the
  // implementation would require additional API functions not provided.
}

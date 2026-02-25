import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_invalid_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator account to obtain valid refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(authorizedModerator);
  // Test 1: Provide an empty refresh token
  const emptyTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await authorize_moderator_refresh(emptyTokenConnection, {
        body: {
          refresh_token: "",
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );
  // Test 2: Provide a randomly generated token
  const randomTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("random token should be rejected", async () => {
    await authorize_moderator_refresh(randomTokenConnection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
  // Test 3: Provide a tampered version of the valid token
  const validToken = authorizedModerator.token.refresh;
  const tamperedToken = validToken.slice(0, -5) + "12345"; // Tamper last 5 characters
  const tamperedTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("tampered token should be rejected", async () => {
    await authorize_moderator_refresh(tamperedTokenConnection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
  // Test 4: Verify that the original valid token still works
  const validTokenConnection: api.IConnection = { host: connection.host };
  const refreshedModerator = await authorize_moderator_refresh(
    validTokenConnection,
    {
      body: {
        refresh_token: validToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    },
  );
  typia.assert(refreshedModerator);
  TestValidator.equals(
    "moderator ID should remain the same",
    refreshedModerator.id,
    authorizedModerator.id,
  );
  TestValidator.equals(
    "email should remain the same",
    refreshedModerator.email,
    authorizedModerator.email,
  );
  TestValidator.equals(
    "username should remain the same",
    refreshedModerator.username,
    authorizedModerator.username,
  );
}

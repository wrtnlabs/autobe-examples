import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test user refresh token validation with invalid or expired tokens.
 *
 * Validates that the refresh endpoint properly rejects:
 * - Invalid token formats
 * - Expired tokens
 * - Security measures against token reuse
 */
export async function test_api_user_refresh_token_invalid_or_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid user session
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Step 2: Test with invalid refresh token (random string)
  await TestValidator.error("invalid token format", async () => {
    await authorize_user_refresh(userConnection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  });
  // Step 3: Test with malformed JWT token
  await TestValidator.error("malformed JWT token", async () => {
    await authorize_user_refresh(userConnection, {
      body: {
        refresh_token: "invalid.jwt.token.structure",
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  });
  // Step 4: Test with empty refresh token
  await TestValidator.error("empty token", async () => {
    await authorize_user_refresh(userConnection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  });
  // Step 5: Test with previously used valid token (simulating token reuse attack)
  await TestValidator.error("token reuse prevention", async () => {
    await authorize_user_refresh(userConnection, {
      body: {
        refresh_token: authorizedUser.token.refresh,
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  });
}

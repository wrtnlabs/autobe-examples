import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token rotation mechanism where each refresh issues completely new tokens
 * and may invalidate old refresh tokens.
 *
 * This test validates security best practices for token refresh by ensuring
 * that refresh tokens can only be used once (if rotation is implemented). The
 * test workflow:
 *
 * 1. Create a moderator account via join endpoint
 * 2. Login to obtain initial access and refresh tokens
 * 3. Perform first token refresh using the refresh token
 * 4. Attempt to reuse the old refresh token (should fail if rotation is
 *    implemented)
 *
 * The test verifies that the system implements appropriate rotation policies to
 * enhance security against token theft.
 */
export async function test_api_moderator_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createData,
    });
  typia.assert(createdModerator);

  // Step 2: Login to get initial tokens (using fresh connection to avoid auto-token management)
  const freshConnection: api.IConnection = { ...connection, headers: {} };
  const loginData = {
    email: createData.email,
    password: createData.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(freshConnection, {
      body: loginData,
    });
  typia.assert(loginResult);

  const initialRefreshToken: string = loginResult.token.refresh;

  // Step 3: Perform first token refresh
  const firstRefreshData = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const firstRefreshResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(freshConnection, {
      body: firstRefreshData,
    });
  typia.assert(firstRefreshResult);

  // Verify new tokens were issued
  TestValidator.predicate(
    "new access token should be different from initial",
    firstRefreshResult.token.access !== loginResult.token.access,
  );

  // Step 4: Attempt to reuse the old refresh token (should fail if rotation is implemented)
  await TestValidator.error(
    "old refresh token should be invalidated after rotation",
    async () => {
      await api.functional.auth.moderator.refresh(freshConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}

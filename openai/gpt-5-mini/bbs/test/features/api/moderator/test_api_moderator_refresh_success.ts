import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_refresh_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique moderator registration data
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();

  // 2) Register (join) moderator-capable account and obtain initial tokens
  const joined: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username,
        email,
        password,
        display_name,
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(joined);

  // Extract initial tokens and timestamps
  const initialAccess: string = joined.token.access;
  const initialRefresh: string = joined.token.refresh;
  const initialRefreshableUntil: string = joined.token.refreshable_until;

  // Basic sanity checks
  typia.assert<IAuthorizationToken>(joined.token);
  TestValidator.predicate(
    "joined response contains access token",
    typeof initialAccess === "string" && initialAccess.length > 0,
  );
  TestValidator.predicate(
    "joined response contains refresh token",
    typeof initialRefresh === "string" && initialRefresh.length > 0,
  );

  // 3) Call refresh endpoint using the initial refresh token
  const refreshed: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialRefresh,
      } satisfies IEconPoliticalForumModerator.IRefresh,
    });
  typia.assert(refreshed);

  // 4) Validate rotation: tokens changed
  TestValidator.notEquals(
    "refresh token must be rotated",
    initialRefresh,
    refreshed.token.refresh,
  );
  TestValidator.notEquals(
    "access token should be refreshed",
    initialAccess,
    refreshed.token.access,
  );

  // 5) Validate timestamps: refreshable_until advanced
  const oldRefreshable = Date.parse(initialRefreshableUntil);
  const newRefreshable = Date.parse(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until advanced",
    newRefreshable > oldRefreshable,
  );

  // 6) Ensure old refresh token cannot be reused (reuse detection)
  await TestValidator.error(
    "old refresh token cannot be reused after rotation",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: initialRefresh,
        } satisfies IEconPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Note: No direct session-revoke or user-delete API available in provided SDK.
  // Rely on CI test database reset / teardown for cleanup.
}

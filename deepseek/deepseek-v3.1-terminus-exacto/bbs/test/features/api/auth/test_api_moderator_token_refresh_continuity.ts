import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_continuity(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      moderation_level: "basic",
      ip: "127.0.0.1",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Authenticate to get initial tokens
  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResult);

  // Store initial moderator identity for comparison
  const initialModeratorId = loginResult.id;
  const initialEmail = loginResult.email;
  const initialUsername = loginResult.username;

  // 3. Perform multiple consecutive refresh operations
  const refreshResults: IDiscussionBoardModerator.IAuthorized[] = [];

  // First refresh using initial refresh token
  const refresh1 = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies IDiscussionBoardModerator.IRefresh,
  });
  typia.assert(refresh1);
  refreshResults.push(refresh1);

  // Second refresh using first refresh's refresh token
  const refresh2 = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: refresh1.token.refresh,
    } satisfies IDiscussionBoardModerator.IRefresh,
  });
  typia.assert(refresh2);
  refreshResults.push(refresh2);

  // Third refresh using second refresh's refresh token
  const refresh3 = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: refresh2.token.refresh,
    } satisfies IDiscussionBoardModerator.IRefresh,
  });
  typia.assert(refresh3);
  refreshResults.push(refresh3);

  // 4. Validate token structure and moderator identity consistency
  refreshResults.forEach((result, index) => {
    TestValidator.predicate(
      `refresh ${index + 1} returns non-empty access token`,
      result.token.access.length > 0,
    );
    TestValidator.predicate(
      `refresh ${index + 1} returns non-empty refresh token`,
      result.token.refresh.length > 0,
    );

    const expiredAt = new Date(result.token.expired_at);
    const refreshableUntil = new Date(result.token.refreshable_until);
    const now = new Date();

    TestValidator.predicate(
      `refresh ${index + 1} has valid expired_at timestamp`,
      expiredAt > now,
    );
    TestValidator.predicate(
      `refresh ${index + 1} has valid refreshable_until timestamp`,
      refreshableUntil > now,
    );

    // Verify moderator identity remains consistent
    TestValidator.equals(
      `refresh ${index + 1} maintains moderator ID`,
      result.id,
      initialModeratorId,
    );
    TestValidator.equals(
      `refresh ${index + 1} maintains email`,
      result.email,
      initialEmail,
    );
    TestValidator.equals(
      `refresh ${index + 1} maintains username`,
      result.username,
      initialUsername,
    );
    TestValidator.equals(
      `refresh ${index + 1} maintains moderation level`,
      result.moderation_level,
      "basic",
    );
  });

  // 5. Verify that tokens are actually rotated (new tokens generated)
  TestValidator.notEquals(
    "first refresh generates new access token",
    refresh1.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "first refresh generates new refresh token",
    refresh1.token.refresh,
    loginResult.token.refresh,
  );

  TestValidator.notEquals(
    "second refresh generates new access token",
    refresh2.token.access,
    refresh1.token.access,
  );
  TestValidator.notEquals(
    "second refresh generates new refresh token",
    refresh2.token.refresh,
    refresh1.token.refresh,
  );

  TestValidator.notEquals(
    "third refresh generates new access token",
    refresh3.token.access,
    refresh2.token.access,
  );
  TestValidator.notEquals(
    "third refresh generates new refresh token",
    refresh3.token.refresh,
    refresh2.token.refresh,
  );

  // 6. Validate refreshable_until timestamp management
  const refreshableUntilDates = refreshResults.map(
    (r) => new Date(r.token.refreshable_until),
  );

  // Ensure refreshable_until is properly set in the future for all refreshes
  refreshableUntilDates.forEach((date, index) => {
    TestValidator.predicate(
      `refresh ${index + 1} refreshable_until is in the future`,
      date > new Date(),
    );
  });

  // Verify that refreshable_until timestamps are properly managed
  // They should be in chronological order or at least valid
  TestValidator.predicate(
    "refreshable_until timestamps are properly sequenced",
    refreshableUntilDates[0] <= refreshableUntilDates[1] ||
      refreshableUntilDates[1] <= refreshableUntilDates[2],
  );
}

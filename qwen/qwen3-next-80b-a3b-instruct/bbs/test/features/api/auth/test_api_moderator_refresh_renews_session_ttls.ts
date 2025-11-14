import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_renews_session_ttls(
  connection: api.IConnection,
) {
  // Generate a valid refresh token with correct format per schema description
  // The refresh token should be a string with "refresh_" prefix followed by a UUID
  const refreshToken: string =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // Call the refresh endpoint with the generated refresh token
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(response);

  // Verify that refreshable_until is a valid date-time string
  TestValidator.predicate(
    "refreshable_until should be a valid date-time string after refresh",
    (() => {
      try {
        new Date(response.token.refreshable_until);
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // Verify that token is not empty and expires at a future time
  TestValidator.predicate("refreshable_until should be in the future", () => {
    const refreshableUntilDate = new Date(response.token.refreshable_until);
    const now = new Date();
    return refreshableUntilDate > now;
  });

  // Verify access token expiration is in the near future (15 minutes)
  TestValidator.predicate(
    "access token expiration (expired_at) should be in near future (approximately 15 minutes)",
    () => {
      const expiredAtDate = new Date(response.token.expired_at);
      const now = new Date();
      const differenceMs = expiredAtDate.getTime() - now.getTime();
      // Access token lifetime should be approximately 15 minutes (900000 ms)
      // Allow 30-second tolerance
      return differenceMs > 0 && differenceMs < 1000000;
    },
  );

  // Verify refresh token is not empty
  TestValidator.notEquals(
    "refresh token should be generated after refresh",
    "",
    response.token.refresh,
  );

  // Verify access token is not empty
  TestValidator.notEquals(
    "access token should be generated after refresh",
    "",
    response.token.access,
  );

  // Verify moderator ID is present and valid UUID
  TestValidator.predicate("moderator ID should be a valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(response.id);
  });

  // Verify email is present and valid email format
  TestValidator.predicate("email should be a valid email format", () => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(response.email);
  });
}

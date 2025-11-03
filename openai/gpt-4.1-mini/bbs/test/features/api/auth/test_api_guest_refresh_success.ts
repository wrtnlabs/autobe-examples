import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
) {
  // 1. Simulate guest refresh to get a valid refresh token (no initial join API provided)
  const dummyRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // 2. Use the dummy refresh token to refresh tokens
  const refreshResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: dummyRefreshToken,
      } satisfies IGuest.IRefresh,
    });
  typia.assert(refreshResponse);

  // 3. Validate the token structure
  const token = refreshResponse.token;
  TestValidator.predicate(
    "refreshResponse has non-empty access token",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshResponse has non-empty refresh token",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 4. Validate expired_at and refreshable_until are valid ISO date-time strings
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      token.refreshable_until,
    ),
  );

  // 5. Check that expired_at is before refreshable_until
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    new Date(token.expired_at).getTime() <
      new Date(token.refreshable_until).getTime(),
  );
}

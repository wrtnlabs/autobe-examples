import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRefreshTokenRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshTokenRequest";

export async function test_api_admin_refresh_token_renewal(
  connection: api.IConnection,
) {
  // 1. Use api.functional.auth.admin.join to create a new admin account with realistic join data.
  // 2. Assert the response matches IRedditCommunityAdmin.IAuthorized.
  // 3. Extract the refresh token from the join response token.refresh.
  // 4. Use api.functional.auth.admin.refresh with the refresh token to obtain new tokens.
  // 5. Assert the refresh response matches IRedditCommunityAdmin.IAuthorized.
  // 6. Assert that access token, refresh token, expired_at, and refreshable_until are strings and look like ISO 8601 (rely on typia.assert for full validation).
  // 7. Assert that the refreshed tokens are different from the original tokens.
  // 8. No header or connection.headers manipulation, SDK manages authorization headers internally.
  const joinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "A1!password",
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/ref",
  } satisfies IRedditCommunityAdmin.IJoin;
  const joined = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.predicate(
    "join returned id is valid UUID",
    /^[0-9a-fA-F-]{36}$/.test(joined.id),
  );
  TestValidator.equals(
    "join returned token.access is string",
    typeof joined.token.access,
    "string",
  );
  TestValidator.equals(
    "join returned token.refresh is string",
    typeof joined.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "join returned token.expired_at is ISO 8601",
    typeof joined.token.expired_at === "string", // trusting typia.assert for full validation
  );
  TestValidator.predicate(
    "join returned token.refreshable_until is ISO 8601",
    typeof joined.token.refreshable_until === "string",
  );
  const refreshBody = {
    refresh_token: joined.token.refresh,
  } satisfies IRefreshTokenRequest;
  const refreshed = await api.functional.auth.admin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.predicate(
    "refresh returned id is valid UUID",
    /^[0-9a-fA-F-]{36}$/.test(refreshed.id),
  );
  TestValidator.equals(
    "refresh returned token.access is string",
    typeof refreshed.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh returned token.refresh is string",
    typeof refreshed.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "refresh returned token.expired_at is ISO 8601",
    typeof refreshed.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refresh returned token.refreshable_until is ISO 8601",
    typeof refreshed.token.refreshable_until === "string",
  );
  TestValidator.notEquals(
    "refreshed token.access differs from original",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refreshed token.refresh differs from original",
    refreshed.token.refresh,
    joined.token.refresh,
  );
}

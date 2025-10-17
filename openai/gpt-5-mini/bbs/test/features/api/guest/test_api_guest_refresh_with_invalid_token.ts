import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";

export async function test_api_guest_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  /**
   * Test: guest refresh with an invalid refresh token
   *
   * Steps:
   *
   * 1. Create a guest identity via POST /auth/guest/join. Assert the response.
   * 2. Attempt to refresh using an intentionally invalid refresh token string.
   * 3. Expect a client error (400, 401, or 403) and ensure no tokens are returned.
   */

  // 1) Create a guest identity
  const joinBody = {
    nickname: RandomGenerator.name(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEconPoliticalForumGuest.ICreate;

  const joined: IEconPoliticalForumGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: joinBody,
    });
  // Validate the join response shape
  typia.assert(joined);

  // Keep local references to the tokens returned on join for sanity checks
  const originalAccess: string = joined.token.access;
  const originalRefresh: string = joined.token.refresh;

  // 2) Attempt refresh with an invalid token and assert failure
  await TestValidator.httpError(
    "guest refresh with invalid token should return client error",
    [400, 401, 403],
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "invalid.token.value",
        } satisfies IEconPoliticalForumGuest.IRefresh,
      });
    },
  );

  // 3) Post-conditions: the original join response remains a valid IAuthorized
  // (typia.assert above already validated it). Re-assert local tokens are strings.
  TestValidator.predicate(
    "original access token is non-empty string",
    typeof originalAccess === "string" && originalAccess.length > 0,
  );
  TestValidator.predicate(
    "original refresh token is non-empty string",
    typeof originalRefresh === "string" && originalRefresh.length > 0,
  );
}

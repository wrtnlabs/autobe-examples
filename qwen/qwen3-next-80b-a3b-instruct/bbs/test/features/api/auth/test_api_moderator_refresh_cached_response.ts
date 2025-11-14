import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_cached_response(
  connection: api.IConnection,
) {
  const refreshToken =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // First refresh request
  const firstResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(firstResponse);

  // Second refresh request with same refresh token
  const secondResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(secondResponse);

  // Verify that access tokens are different (indicating no caching)
  TestValidator.notEquals(
    "refresh tokens should be unique on each request",
    firstResponse.token.access,
    secondResponse.token.access,
  );
}

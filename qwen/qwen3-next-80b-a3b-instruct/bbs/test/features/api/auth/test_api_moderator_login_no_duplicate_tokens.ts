import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_no_duplicate_tokens(
  connection: api.IConnection,
) {
  const loginData = typia.random<IPoliticalForumModerator.ILogin>();

  // First login request
  const firstResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(firstResponse);

  // Second identical login request
  const secondResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(secondResponse);

  // Verify access tokens are different strings
  TestValidator.notEquals(
    "two login requests should produce different access tokens",
    firstResponse.token.access,
    secondResponse.token.access,
  );
}

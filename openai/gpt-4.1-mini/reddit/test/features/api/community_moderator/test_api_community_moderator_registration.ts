import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_registration(
  connection: api.IConnection,
) {
  // Generate test input data for community moderator registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // reasonable password length
  const nickname = RandomGenerator.name();

  // Prepare request body
  const requestBody = {
    email,
    password,
    nickname,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Call the join API
  const authorizedUser: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: requestBody,
    });

  // Assert the result type correctness
  typia.assert(authorizedUser);

  // Verify essential properties
  TestValidator.predicate(
    "community moderator id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      authorizedUser.id,
    ),
  );
  TestValidator.equals("email matches input", authorizedUser.email, email);
  TestValidator.predicate(
    "token access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid date-time string",
    !isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date-time string",
    !isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_join_success(
  connection: api.IConnection,
) {
  const randomEmail = `${RandomGenerator.alphabets(8).toLowerCase()}@example.com`;
  const randomPassword = RandomGenerator.alphaNumeric(12);
  const randomUsername = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: randomEmail,
      password: randomPassword,
      username: randomUsername,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.equals("moderator id is uuid", moderator.id.length, 36);
  TestValidator.equals(
    "token type is 'Bearer'",
    moderator.token.access.substring(0, 7),
    "Bearer ",
  );
  TestValidator.predicate(
    "access token expiration is future",
    new Date(moderator.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is future",
    new Date(moderator.token.refreshable_until) > new Date(),
  );
}

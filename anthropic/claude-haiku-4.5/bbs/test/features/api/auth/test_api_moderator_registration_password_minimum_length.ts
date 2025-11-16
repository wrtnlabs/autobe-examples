import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_password_minimum_length(
  connection: api.IConnection,
) {
  // Test 1: Password shorter than 8 characters should fail
  const shortPassword = RandomGenerator.alphabets(7); // 7 characters
  await TestValidator.error(
    "registration should fail with password shorter than 8 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: RandomGenerator.alphaNumeric(10),
          password: shortPassword,
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Test 2: Password with exactly 8 characters should succeed
  const validPassword8 = RandomGenerator.alphabets(8); // 8 characters
  const moderator8: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: validPassword8,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator8);
  TestValidator.predicate(
    "moderator with 8-character password should have valid id",
    moderator8.id.length > 0,
  );
  TestValidator.predicate(
    "moderator with 8-character password should have access token",
    moderator8.token.access.length > 0,
  );

  // Test 3: Password with 16 characters should succeed
  const validPassword16 = RandomGenerator.alphabets(16); // 16 characters
  const moderator16: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: validPassword16,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator16);
  TestValidator.predicate(
    "moderator with 16-character password should be created",
    moderator16.id.length > 0,
  );

  // Test 4: Password with 32 characters should succeed
  const validPassword32 = RandomGenerator.alphabets(32); // 32 characters
  const moderator32: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: validPassword32,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator32);
  TestValidator.predicate(
    "moderator with 32-character password should be created",
    moderator32.id.length > 0,
  );
}

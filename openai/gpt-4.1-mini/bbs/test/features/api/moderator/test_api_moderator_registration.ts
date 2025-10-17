import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // 1. Generate random but valid moderator creation data
  const email = `${RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "")}@example.com`;
  const password = RandomGenerator.alphaNumeric(12); // 12-char alphanumeric password
  const display_name = RandomGenerator.name(2);

  // 2. Execute the moderator join operation
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: email,
        password: password,
        display_name: display_name,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // 3. Validate the structure of the returned authorized moderator object
  typia.assert(moderator);

  // 4. Assert properties of the moderator account
  TestValidator.predicate(
    "Moderator ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.equals("Moderator email matches input", moderator.email, email);
  TestValidator.equals(
    "Moderator display_name matches input",
    moderator.display_name,
    display_name,
  );
  TestValidator.predicate(
    "Moderator created_at is valid ISO datetime",
    !Number.isNaN(Date.parse(moderator.created_at)),
  );
  TestValidator.predicate(
    "Moderator updated_at is valid ISO datetime",
    !Number.isNaN(Date.parse(moderator.updated_at)),
  );
  TestValidator.predicate(
    "Moderator deleted_at is null or ISO datetime",
    moderator.deleted_at === null ||
      moderator.deleted_at === undefined ||
      !Number.isNaN(Date.parse(moderator.deleted_at)),
  );

  // 5. Assert JWT token structure
  TestValidator.predicate(
    "Token access is a non-empty string",
    !!moderator.token.access && typeof moderator.token.access === "string",
  );
  TestValidator.predicate(
    "Token refresh is a non-empty string",
    !!moderator.token.refresh && typeof moderator.token.refresh === "string",
  );
  TestValidator.predicate(
    "Token expired_at is valid ISO datetime",
    !Number.isNaN(Date.parse(moderator.token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is valid ISO datetime",
    !Number.isNaN(Date.parse(moderator.token.refreshable_until)),
  );
}

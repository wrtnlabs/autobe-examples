import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_category_max_length_properties(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(50), // Max length username
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      two_factor_enabled: false,
      email_verified: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a category with maximum length name and description
  const maxName = RandomGenerator.alphabets(100); // Maximum 100 characters
  const maxDescription = RandomGenerator.alphabets(500); // Maximum 500 characters

  const createBody = {
    code: RandomGenerator.alphabets(50), // URL-safe code
    name: maxName,
    description: maxDescription,
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(category);

  // Step 3: Validate the category was created with correct max lengths
  TestValidator.equals("category name length", category.name.length, 100);
  TestValidator.equals("category code length", category.code.length, 50);
  TestValidator.predicate(
    "category description should be defined",
    category.description !== null && category.description !== undefined,
  );
  TestValidator.equals(
    "category description length",
    category.description!.length,
    500,
  );
  TestValidator.equals("category name matches input", category.name, maxName);
  TestValidator.equals(
    "category description matches input",
    category.description,
    maxDescription,
  );
  TestValidator.equals("category is active", category.is_active, true);
  TestValidator.equals("category display order", category.display_order, 1);
  TestValidator.predicate(
    "category has valid UUID",
    typia.is<string & tags.Format<"uuid">>(category.id),
  );
  TestValidator.predicate(
    "category has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(category.created_at),
  );
  TestValidator.predicate(
    "category has update timestamp",
    typia.is<string & tags.Format<"date-time">>(category.updated_at),
  );
  TestValidator.equals("initial article count", category.article_count, 0);
}

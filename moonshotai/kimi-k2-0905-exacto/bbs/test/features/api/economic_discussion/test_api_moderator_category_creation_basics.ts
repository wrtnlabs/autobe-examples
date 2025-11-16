import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful category creation by moderator with all required fields
 * including unique code, descriptive name, display ordering, and active status.
 * Validates category creation workflow and proper system integration.
 *
 * 1. Create moderator account for authentication
 * 2. Generate valid category creation data with all required fields
 * 3. Create new discussion category using authenticated moderator
 * 4. Validate the created category properties match the input data
 * 5. Verify system-generated fields (id, timestamps, article_count) are correctly
 *    set
 */
export async function test_api_moderator_category_creation_basics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorInput = {
    username: RandomGenerator.name(2).replace(" ", "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: "standard",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorInput,
  });
  typia.assert(moderatorAuth);

  TestValidator.equals(
    "moderator username matches",
    moderatorAuth.username,
    moderatorInput.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderatorAuth.email,
    moderatorInput.email,
  );

  // Step 2: Generate valid category creation data with all required fields
  const categoryCode = RandomGenerator.alphabets(8).toLowerCase();
  const categoryName = RandomGenerator.name(3);
  const categoryBody = {
    code: categoryCode,
    name: categoryName,
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  // Step 3: Create new discussion category using authenticated moderator
  const createdCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Validate the created category properties match the input data
  TestValidator.equals(
    "category code matches input",
    createdCategory.code,
    categoryBody.code,
  );
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryBody.description,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    categoryBody.display_order,
  );
  TestValidator.equals(
    "category is_active matches input",
    createdCategory.is_active,
    categoryBody.is_active,
  );

  // Step 5: Verify system-generated fields are correctly set
  TestValidator.predicate(
    "category has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(createdCategory.id),
  );
  TestValidator.predicate(
    "category has article_count of 0",
    createdCategory.article_count === 0,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    createdCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "category deleted_at is null",
    createdCategory.deleted_at === null,
  );
}

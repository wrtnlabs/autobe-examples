import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_economic_discussion_category_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register as a moderator to gain category creation permissions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "full",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a new discussion category with complete metadata
  const categoryCode = RandomGenerator.alphabets(8);
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 10 });
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          description: categoryDescription,
          display_order: displayOrder,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Validate the created category metadata
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "display order matches",
    category.display_order,
    displayOrder,
  );
  TestValidator.predicate("category is active", category.is_active === true);
  TestValidator.predicate(
    "category has valid UUID",
    typeof category.id === "string" && category.id.length > 0,
  );
  TestValidator.predicate(
    "category has creation timestamp",
    typeof category.created_at === "string",
  );
  TestValidator.predicate(
    "category has update timestamp",
    typeof category.updated_at === "string",
  );
  TestValidator.equals(
    "initial article count is zero",
    category.article_count,
    0,
  );
  TestValidator.equals("category is not deleted", category.deleted_at, null);
}

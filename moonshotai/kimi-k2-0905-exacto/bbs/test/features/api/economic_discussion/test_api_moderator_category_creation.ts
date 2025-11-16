import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful category creation by authenticated moderator. Creates a new
 * moderator account, then uses that moderator to create a discussion category
 * with all required fields. Validates the category response structure,
 * metadata, and business logic rules.
 */
export async function test_api_moderator_category_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for category creation
  const moderatorEmail = RandomGenerator.name(1) + "@example.com";
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = "securepassword123";

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password_hash: moderatorPassword,
        moderation_level: "standard",
        email_verified: true,
        two_factor_enabled: false,
      } satisfies IEconomicDiscussionModerator.ICreate,
    });

  typia.assert(moderator);

  // Step 2: Create category structure with proper business data
  const categoryCode = RandomGenerator.alphabets(8);
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.content({ paragraphs: 1 });
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  // Step 3: Create the new discussion category
  const createdCategory: IEconomicDiscussionCategory =
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

  // Step 4: Validate the category creation response
  typia.assert(createdCategory);

  // Step 5: Validate business logic requirements
  TestValidator.equals(
    "category code matches input",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category display order matches input",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "category is active",
    createdCategory.is_active === true,
  );
  TestValidator.predicate(
    "article count is initially zero",
    createdCategory.article_count === 0,
  );
  TestValidator.predicate(
    "category has valid ID format",
    typeof createdCategory.id === "string" && createdCategory.id.length > 0,
  );

  // Step 6: Validate timestamp business logic
  const createdAt = new Date(createdCategory.created_at);
  const updatedAt = new Date(createdCategory.updated_at);
  const now = new Date();

  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "timestamps are recent",
    Math.abs(createdAt.getTime() - now.getTime()) < 60000,
  );
  TestValidator.predicate(
    "updated_at equals or follows created_at",
    updatedAt >= createdAt,
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    createdCategory.deleted_at === null,
  );
}

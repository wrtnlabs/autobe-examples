import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful creation of new discussion categories by authenticated
 * moderators. Validates proper category structure, display ordering, and
 * activation status management.
 *
 * This comprehensive test covers:
 *
 * 1. Moderator account creation with complete registration data
 * 2. Category creation with various property configurations
 * 3. Response validation ensuring proper data structure and timestamps
 * 4. Optional parameter testing (description field)
 * 5. Category activation status management
 *
 * The test follows the expected business flow where moderated administrative
 * privileges must be established before content organization capabilities can
 * be utilized in the economic discussion platform.
 */
export async function test_api_moderator_category_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account with comprehensive registration data
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "senior",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create category with all properties including optional description
  const categoryWithDescription = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const createdCategoryWithDesc =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryWithDescription },
    );
  typia.assert(createdCategoryWithDesc);

  // Validate complete category structure
  TestValidator.equals(
    "category code matches",
    createdCategoryWithDesc.code,
    categoryWithDescription.code,
  );
  TestValidator.equals(
    "category name matches",
    createdCategoryWithDesc.name,
    categoryWithDescription.name,
  );
  TestValidator.equals(
    "category description matches",
    createdCategoryWithDesc.description,
    categoryWithDescription.description,
  );
  TestValidator.equals(
    "category display order matches",
    createdCategoryWithDesc.display_order,
    categoryWithDescription.display_order,
  );
  TestValidator.equals(
    "category active status matches",
    createdCategoryWithDesc.is_active,
    categoryWithDescription.is_active,
  );
  TestValidator.equals(
    "initial article count is zero",
    createdCategoryWithDesc.article_count,
    0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    !!createdCategoryWithDesc.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    !!createdCategoryWithDesc.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null for new category",
    createdCategoryWithDesc.deleted_at === null,
  );
  TestValidator.predicate(
    "category has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdCategoryWithDesc.id),
  );

  // Step 3: Create category without description to test optional parameter handling
  const categoryWithoutDescription = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    display_order: 2,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const createdCategoryNoDesc =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryWithoutDescription },
    );
  typia.assert(createdCategoryNoDesc);

  // Validate category without description has expected structure
  TestValidator.equals(
    "category code matches",
    createdCategoryNoDesc.code,
    categoryWithoutDescription.code,
  );
  TestValidator.equals(
    "category name matches",
    createdCategoryNoDesc.name,
    categoryWithoutDescription.name,
  );
  TestValidator.equals(
    "category description is null",
    createdCategoryNoDesc.description,
    undefined,
  );
  TestValidator.equals(
    "category display order matches",
    createdCategoryNoDesc.display_order,
    categoryWithoutDescription.display_order,
  );
  TestValidator.equals(
    "category active status is false",
    createdCategoryNoDesc.is_active,
    categoryWithoutDescription.is_active,
  );
  TestValidator.equals(
    "initial article count is zero",
    createdCategoryNoDesc.article_count,
    0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    !!createdCategoryNoDesc.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    !!createdCategoryNoDesc.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null for new category",
    createdCategoryNoDesc.deleted_at === null,
  );
  TestValidator.predicate(
    "category has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdCategoryNoDesc.id),
  );
}

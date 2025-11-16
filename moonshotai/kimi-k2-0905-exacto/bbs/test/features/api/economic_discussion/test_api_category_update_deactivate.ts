import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_category_update_deactivate(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create test category with initial active status
  const categoryCode = RandomGenerator.alphabets(8);
  const categoryCreateData = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const createdCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryCreateData,
      },
    );
  typia.assert(createdCategory);

  // Validate initial category state
  TestValidator.equals(
    "category should be active initially",
    createdCategory.is_active,
    true,
  );
  TestValidator.equals(
    "category code should match",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name should match",
    createdCategory.name,
    categoryCreateData.name,
  );

  // Step 3: Deactivate category by setting is_active to false
  const deactivateData = {
    is_active: false,
  } satisfies IEconomicDiscussionCategory.IUpdate;

  const deactivatedCategory =
    await api.functional.economicDiscussion.moderator.categories.update(
      connection,
      {
        categoryCode: categoryCode,
        body: deactivateData,
      },
    );
  typia.assert(deactivatedCategory);

  // Step 4: Verify category is deactivated
  TestValidator.equals(
    "category should be inactive after deactivation",
    deactivatedCategory.is_active,
    false,
  );
  TestValidator.equals(
    "category code should remain the same",
    deactivatedCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name should remain unchanged",
    deactivatedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category id should remain the same",
    deactivatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "article count should remain unchanged",
    deactivatedCategory.article_count,
    createdCategory.article_count,
  );

  // Step 5: Reactivate category by setting is_active back to true
  const reactivateData = {
    is_active: true,
  } satisfies IEconomicDiscussionCategory.IUpdate;

  const reactivatedCategory =
    await api.functional.economicDiscussion.moderator.categories.update(
      connection,
      {
        categoryCode: categoryCode,
        body: reactivateData,
      },
    );
  typia.assert(reactivatedCategory);

  // Step 6: Verify category is fully restored
  TestValidator.equals(
    "category should be active after reactivation",
    reactivatedCategory.is_active,
    true,
  );
  TestValidator.equals(
    "all category properties should be restored",
    reactivatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category code should remain consistent",
    reactivatedCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name should remain unchanged",
    reactivatedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "display order should remain unchanged",
    reactivatedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "description should remain unchanged",
    reactivatedCategory.description,
    createdCategory.description,
  );
}

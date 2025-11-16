import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_economic_discussion_category_creation_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
      moderation_level: "admin",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // 2. Create category with minimal required fields (omitting optional description)
  const categoryData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const createdCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // 3. Validate the created category has correct minimal fields
  TestValidator.equals(
    "category code matches input",
    createdCategory.code,
    categoryData.code,
  );
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category is_active matches input",
    createdCategory.is_active,
    categoryData.is_active,
  );

  // 4. Validate optional description field is properly handled (null or undefined)
  TestValidator.predicate(
    "category description is null or undefined",
    createdCategory.description === null ||
      createdCategory.description === undefined,
  );

  // 5. Validate system-generated fields are present and correctly typed
  TestValidator.predicate(
    "category has valid UUID",
    createdCategory.id.length > 0,
  );
  TestValidator.predicate(
    "category article_count is non-negative",
    createdCategory.article_count >= 0,
  );
  TestValidator.predicate(
    "category created_at is valid ISO datetime",
    createdCategory.created_at.includes("T"),
  );
  TestValidator.predicate(
    "category updated_at is valid ISO datetime",
    createdCategory.updated_at.includes("T"),
  );
}

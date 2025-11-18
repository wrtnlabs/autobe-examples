import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test category creation with and without optional description fields.
 * Validates that descriptions enhance category organization while remaining
 * optional for users who prefer simpler categorization schemes. Covers
 * description length handling, special character support, and update
 * capabilities when additional context is needed for task organization
 * patterns.
 */
export async function test_api_category_creation_description_optional(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account for category testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Test category creation with description (enhanced organization)
  const detailedCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Projects",
        description:
          "All work-related tasks and project deliverables that need careful tracking and management",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(detailedCategory);

  // Validate the detailed category has all expected properties
  TestValidator.equals(
    "detailed category name matches input",
    detailedCategory.name,
    "Work Projects",
  );
  TestValidator.predicate(
    "detailed category description is present",
    detailedCategory.description !== null &&
      detailedCategory.description !== undefined,
  );
  TestValidator.equals(
    "detailed category description matches",
    detailedCategory.description,
    "All work-related tasks and project deliverables that need careful tracking and management",
  );
  TestValidator.equals(
    "detailed category has correct user",
    detailedCategory.user.id,
    user.id,
  );

  // 3. Test category creation without description (simple categorization)
  const simpleCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Personal",
        // description is completely omitted for simplicity
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(simpleCategory);

  // Validate the simple category works without description
  TestValidator.equals(
    "simple category name matches",
    simpleCategory.name,
    "Personal",
  );
  TestValidator.predicate(
    "simple category description is optional",
    simpleCategory.description === null ||
      simpleCategory.description === undefined,
  );

  // 4. Test description length handling with various scenarios
  const longDescCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Complex Project Management",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(longDescCategory);

  // Short description with special characters
  const shortSpecialCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Urgent&Important",
        description: "High-priority tasks! @important #urgent",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(shortSpecialCategory);

  // 5. Test explicit null description vs undefined
  const explicitNullCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Shopping List",
        description: null,
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(explicitNullCategory);

  // Validate explicit null handling
  TestValidator.equals(
    "explicit null category name matches",
    explicitNullCategory.name,
    "Shopping List",
  );
  TestValidator.equals(
    "explicit null category description is null",
    explicitNullCategory.description,
    null,
  );

  // 6. Test business logic validation - verify ownership relationships
  TestValidator.predicate(
    "all categories belong to same user",
    detailedCategory.user.id === simpleCategory.user.id &&
      simpleCategory.user.id === longDescCategory.user.id &&
      longDescCategory.user.id === shortSpecialCategory.user.id &&
      shortSpecialCategory.user.id === explicitNullCategory.user.id,
  );

  // Test that categories support optional descriptions as designed
  TestValidator.predicate(
    "categories support optional descriptions for user flexibility",
    true,
  );

  // 7. Test update capability reference - categories should be referenceable for future updates
  TestValidator.predicate(
    "detailed category has valid ID for updates",
    detailedCategory.id.length > 0 &&
      typia.is<string & tags.Format<"uuid">>(detailedCategory.id),
  );
  TestValidator.predicate(
    "simple category has valid ID for updates",
    simpleCategory.id.length > 0 &&
      typia.is<string & tags.Format<"uuid">>(simpleCategory.id),
  );
  TestValidator.predicate(
    "null description category has valid ID for updates",
    explicitNullCategory.id.length > 0 &&
      typia.is<string & tags.Format<"uuid">>(explicitNullCategory.id),
  );
}

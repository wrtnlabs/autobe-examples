import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_creation_with_display_order(
  connection: api.IConnection,
) {
  // Step 1: System Administrator Authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create categories with display ordering
  const categories = await ArrayUtil.asyncMap(
    [1, 2, 3, 4, 5],
    async (order) => {
      const categoryNames = [
        "Economic Policy",
        "Political Analysis",
        "Market Discussion",
        "Legislative Updates",
        "International Relations",
      ];

      const category: IEconPoliticalDiscussionCategory =
        await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
          connection,
          {
            body: {
              name: categoryNames[order - 1],
              description: `${categoryNames[order - 1]} category for economic and political discussions`,
              display_order: order,
              is_active: true,
            } satisfies IEconPoliticalDiscussionCategory.ICreate,
          },
        );
      typia.assert(category);
      return category;
    },
  );

  // Step 3: Validate display_order functionality
  for (const category of categories) {
    TestValidator.predicate(
      `category ${category.name} has valid display_order`,
      category.display_order >= 1 && category.display_order <= 5,
    );
  }

  // Step 4: Verify ordering sequence
  const orderedCategories = categories.sort(
    (a, b) => a.display_order - b.display_order,
  );
  const expectedOrder = [1, 2, 3, 4, 5];
  const actualOrder = orderedCategories.map((c) => c.display_order);

  TestValidator.equals(
    "categories are ordered correctly by display_order",
    actualOrder,
    expectedOrder,
  );

  // Step 5: Test edge case - category without display_order
  const defaultCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          description: "General economic and political discussion category",
        } satisfies IEconPoliticalDiscussionCategory.ICreate,
      },
    );
  typia.assert(defaultCategory);

  TestValidator.predicate(
    "default category has display_order assigned",
    typeof defaultCategory.display_order === "number",
  );

  // Step 6: Validate all categories have required properties
  const allCategories = [...categories, defaultCategory];
  for (const category of allCategories) {
    TestValidator.predicate(
      `category ${category.name} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );

    TestValidator.equals(
      `category ${category.name} has correct status`,
      category.status,
      "active",
    );

    TestValidator.predicate(
      `category ${category.name} has timestamps`,
      !!category.created_at && !!category.updated_at,
    );
  }
}

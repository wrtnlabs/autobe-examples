import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category with only required fields (name, slug, display_order)
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryDisplayOrder = 1;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: categoryDisplayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate category was created successfully with input data
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    categoryDisplayOrder,
  );

  // Step 4: Verify category defaults are applied correctly
  TestValidator.predicate(
    "category is marked as active by default",
    createdCategory.is_active === true,
  );

  // Step 5: Verify optional fields remain unset when not provided
  TestValidator.equals(
    "description is null when not provided",
    createdCategory.description,
    null,
  );
  TestValidator.equals(
    "icon_url is null when not provided",
    createdCategory.icon_url,
    null,
  );
}

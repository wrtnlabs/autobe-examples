import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category creation with optional icon URL.
 *
 * This test validates that when creating a community platform category with an
 * optional icon_url parameter pointing to an image resource, the icon URL is
 * properly stored and accessible in the response. This enables visual
 * distinction between categories in selection interfaces.
 *
 * The test workflow:
 *
 * 1. Create administrator account (prerequisite authentication)
 * 2. Prepare category creation data with icon URL
 * 3. Create the category with all properties including icon URL
 * 4. Validate that the response includes all properties correctly
 * 5. Verify that the icon URL is accessible and stored properly
 */
export async function test_api_category_creation_with_icon(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorData = {
    email: administratorEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: administratorData,
    },
  );
  typia.assert(administrator);

  // Step 2: Prepare category creation data with icon URL
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .substring(0, 255);
  const iconUrl = typia.random<string & tags.Format<"uri">>();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const categoryData = {
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    icon_url: iconUrl,
    display_order: displayOrder,
  } satisfies ICommunityPlatformCategory.ICreate;

  // Step 3: Create the category with icon URL
  const createdCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Validate that the response includes all properties correctly
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category display order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );

  // Step 5: Verify that the icon URL is accessible and stored properly
  TestValidator.equals(
    "icon URL is stored correctly",
    createdCategory.icon_url,
    iconUrl,
  );

  // Verify that the category is active when created
  TestValidator.predicate(
    "category is active upon creation",
    createdCategory.is_active === true,
  );

  // Verify that the category has a valid UUID identifier
  TestValidator.predicate(
    "category has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );

  // Verify timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    !isNaN(Date.parse(createdCategory.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date",
    !isNaN(Date.parse(createdCategory.updated_at)),
  );
}

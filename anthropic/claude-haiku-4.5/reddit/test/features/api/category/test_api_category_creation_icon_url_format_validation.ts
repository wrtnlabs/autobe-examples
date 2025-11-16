import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate icon URL format validation during category creation.
 *
 * Tests that the category creation endpoint properly accepts and stores
 * icon_url values in valid URI format:
 *
 * - Valid HTTP/HTTPS URLs are properly stored
 * - Optional icon_url field can be null when not provided
 * - Icon URLs are correctly returned in category responses
 *
 * Process:
 *
 * 1. Create administrator account for authentication
 * 2. Create category with valid HTTPS icon URL
 * 3. Verify valid icon URL is accepted and returned
 * 4. Create category with alternative valid URL format
 * 5. Create category with null icon_url (optional field)
 * 6. Verify all categories have correct icon_url values
 */
export async function test_api_category_creation_icon_url_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123",
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category with valid icon URL
  const validIconUrl = "https://example.com/icons/technology.png";
  const categoryWithValidUrl =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech and programming communities",
          icon_url: validIconUrl,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithValidUrl);
  TestValidator.equals(
    "valid icon URL accepted",
    categoryWithValidUrl.icon_url,
    validIconUrl,
  );

  // Step 3: Create category with alternative valid URL format
  const anotherValidUrl =
    "https://cdn.example.com/images/entertainment-icon.svg";
  const categoryWithAnotherValidUrl =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: "entertainment",
          description: "Entertainment and media communities",
          icon_url: anotherValidUrl,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithAnotherValidUrl);
  TestValidator.equals(
    "alternative valid icon URL accepted",
    categoryWithAnotherValidUrl.icon_url,
    anotherValidUrl,
  );

  // Step 4: Create category with null icon_url (optional field)
  const categoryWithoutIcon =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Education",
          slug: "education",
          description: "Educational communities",
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithoutIcon);
  TestValidator.equals(
    "null icon URL is accepted",
    categoryWithoutIcon.icon_url,
    null,
  );

  // Step 5: Create category without icon_url field (optional field omitted)
  const categoryWithUndefinedIcon =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Arts",
          slug: "arts",
          description: "Arts and creative communities",
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithUndefinedIcon);

  // Step 6: Verify all categories have correct structure and data
  TestValidator.predicate(
    "created categories have valid icon_url format",
    categoryWithValidUrl.icon_url === validIconUrl &&
      categoryWithAnotherValidUrl.icon_url === anotherValidUrl &&
      categoryWithoutIcon.icon_url === null,
  );
}
